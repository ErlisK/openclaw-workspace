#!/usr/bin/env python3
"""
ClipSpark Heuristic Scorer
===========================
Polls Supabase for processing_jobs with status='scoring',
loads the transcript + word timings,
runs the v0.2 heuristic scorer to propose 3-5 clip segments,
writes clip_outputs rows, then advances job → rendering.

Heuristics applied (v0.2):
  1. HOOK_WORDS  — keyword match on high-engagement phrases
  2. ENERGY      — word density (words/sec) spike detection
  3. QUESTION    — question sentences (natural engagement hooks)
  4. STORY       — narrative arc markers (first/then/finally/result)
  5. CONTRAST    — contrasting phrases (but/however/actually/turns out)
  6. NUMBERS     — specific data/stats (numbers improve shareability)
  7. PAUSE       — long silence before a segment (emphasis via contrast)

Each signal contributes a weighted score 0.0–1.0.
Top N non-overlapping windows are selected.

Usage:
    python3 scoring_worker.py [--once]

Environment:
    SUPABASE_URL                (default: https://twctmwwqxvenvieijmtn.supabase.co)
    SUPABASE_SERVICE_ROLE_KEY   (required)
    SCORER_VERSION              (default: v0.2)
    POLL_INTERVAL               (default: 15)
"""

import os
import re
import sys
import json
import math
import time
import logging
import argparse
import urllib.request
import urllib.parse
from typing import NamedTuple

# Import enhanced title/hashtag/thumbnail module (optional)
try:
    import sys as _sys
    import os as _os
    _sys.path.insert(0, _os.path.dirname(__file__))
    from title_thumbnail import (
        extract_keywords as _extract_kws,
        generate_title_variants as _gen_title_variants,
        generate_hashtags as _gen_hashtags,
    )
    _HAS_TITLE_MODULE = True
except ImportError:
    _HAS_TITLE_MODULE = False

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [scoring_worker] %(levelname)s %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
log = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://twctmwwqxvenvieijmtn.supabase.co')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
SCORER_VERSION = os.environ.get('SCORER_VERSION', 'v0.2')
POLL_INTERVAL = int(os.environ.get('POLL_INTERVAL', '15'))

# ── Heuristic weights (must sum to 1.0) ─────────────────────────────────────
WEIGHTS = {
    'hook_words':  0.30,
    'energy':      0.20,
    'question':    0.15,
    'story':       0.12,
    'contrast':    0.10,
    'numbers':     0.08,
    'pause':       0.05,
}

# ── Hook word taxonomy ───────────────────────────────────────────────────────
HOOK_WORDS = {
    # High-signal: strong engagement
    'high': [
        r'\bsecret\b', r'\bmistake\b', r'\bwrong\b', r'\bhack\b', r'\btrick\b',
        r'\bwarning\b', r'\balert\b', r'\bbreaking\b', r'\bshocking\b', r'\bwow\b',
        r'\bcrazy\b', r'\binsane\b', r'\bunbelievable\b', r'\bamazing\b',
        r'\btransformed?\b', r'\bchanged? my\b', r'\bgame.?changer\b',
        r'\bthe truth\b', r'\bnobody talks about\b', r'\bstop doing\b',
        r'\bdon\'t do\b', r'\byou need to\b', r'\bwhy i quit\b',
        r'\bi was wrong\b', r'\bi made a\b', r'\bhow i\b',
        r'\bstep.by.step\b', r'\bexactly how\b', r'\bthe real reason\b',
    ],
    # Medium-signal
    'mid': [
        r'\btips?\b', r'\bstrategy\b', r'\bframework\b', r'\bsystem\b',
        r'\bprocess\b', r'\bapproach\b', r'\bmethod\b', r'\bformula\b',
        r'\blessons?\b', r'\blearned?\b', r'\badvice\b', r'\bkey\b',
        r'\bimportant\b', r'\bcritical\b', r'\bessential\b', r'\bfundamental\b',
        r'\bactually\b', r'\bhonestly\b', r'\btruthfully\b', r'\breally\b',
        r'\b(?:first|second|third|fourth|fifth)\b',
        r'\bnumber one\b', r'\bnumber two\b',
        r'\bthe (biggest|main|best|worst|top)\b',
    ],
}

QUESTION_PATTERN = re.compile(
    r'(?i)(how\s|what\s|why\s|when\s|where\s|who\s|which\s|do\s|did\s|can\s|could\s|'
    r'should\s|would\s|are\s|is\s|was\s|were\s|have\s|has\s|will\s)[^.?!]{5,60}[?]'
)

STORY_MARKERS = re.compile(
    r'(?i)\b(so\s+i|first\s+i|then\s+i|finally\s+i|after\s+that|'
    r'next\s+thing|turns?\s+out|long\s+story|the\s+thing\s+is|'
    r'here\'s\s+what|what\s+happened\s+was|i\s+realized|i\s+discovered|'
    r'that\'s\s+when|and\s+that\s+changed|here\'s\s+the\s+thing)\b'
)

CONTRAST_MARKERS = re.compile(
    r'(?i)\b(but\s+actually|however|on\s+the\s+other\s+hand|'
    r'contrary\s+to|the\s+opposite|instead\s+of|rather\s+than|'
    r'turns?\s+out|plot\s+twist|actually|in\s+reality|the\s+truth\s+is|'
    r'what\s+most\s+people|common\s+mistake|everyone\s+thinks)\b'
)

NUMBER_PATTERN = re.compile(
    r'(?i)(\b\d+(?:\.\d+)?(?:\s*%|\s*x|\s*times|\s*percent|\s*dollars?|\s*k|\s*million|\s*billion)?\b'
    r'|\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:percent|times|ways|steps|reasons|tips|things)\b)'
)


# ── Data structures ──────────────────────────────────────────────────────────

class Segment(NamedTuple):
    idx: int
    start: float
    end: float
    text: str
    words: list  # [{word, start, end, probability}]


class ScoredWindow(NamedTuple):
    start: float
    end: float
    score: float
    signals: dict
    hook_type: str
    anchor_segment_idx: int


# ── Supabase helpers ─────────────────────────────────────────────────────────

def sb_headers():
    return {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
    }


def sb_get(path: str) -> list | dict:
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{path}',
        headers={**sb_headers(), 'Accept': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def sb_patch(table: str, filter_qs: str, payload: dict):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}?{filter_qs}',
        data=data, method='PATCH', headers=sb_headers(),
    )
    with urllib.request.urlopen(req, timeout=15):
        pass


def sb_insert(table: str, payload: dict) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}',
        data=data, method='POST',
        headers={**sb_headers(), 'Prefer': 'return=representation'},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        rows = json.loads(r.read())
        return rows[0] if isinstance(rows, list) else rows


def fetch_scoring_jobs(limit=3) -> list:
    params = urllib.parse.urlencode({'status': 'eq.scoring', 'limit': str(limit), 'order': 'created_at.asc'})
    try:
        return sb_get(f'processing_jobs?{params}')
    except Exception as e:
        log.warning(f'fetch_scoring_jobs: {e}')
        return []


def fetch_transcript(asset_id: str) -> dict | None:
    params = urllib.parse.urlencode({'media_asset_id': f'eq.{asset_id}', 'limit': '1', 'order': 'created_at.desc'})
    try:
        rows = sb_get(f'transcripts?{params}')
        return rows[0] if rows else None
    except Exception as e:
        log.warning(f'fetch_transcript: {e}')
        return None


def update_job_status(job_id: str, status: str, extra: dict | None = None):
    payload = {'status': status, 'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
    if extra:
        payload.update(extra)
    sb_patch('processing_jobs', f'id=eq.{job_id}', payload)


# ── Heuristic scoring engine ─────────────────────────────────────────────────

def score_hook_words(text: str) -> float:
    """Score 0.0–1.0 based on presence of high/medium hook phrases."""
    score = 0.0
    text_lower = text.lower()
    for pattern in HOOK_WORDS['high']:
        if re.search(pattern, text_lower):
            score = min(1.0, score + 0.25)
    for pattern in HOOK_WORDS['mid']:
        if re.search(pattern, text_lower):
            score = min(1.0, score + 0.10)
    return min(1.0, score)


def score_energy(words: list, duration: float) -> float:
    """Score based on word density — more words/sec = higher energy."""
    if not words or duration <= 0:
        return 0.0
    wps = len(words) / duration
    # Baseline: 2.0 wps is normal speech; 3.5+ is high energy
    return min(1.0, max(0.0, (wps - 1.5) / 2.5))


def score_question(text: str) -> float:
    """1.0 if text contains a question, else 0."""
    matches = QUESTION_PATTERN.findall(text)
    return min(1.0, len(matches) * 0.5)


def score_story(text: str) -> float:
    """Score based on narrative arc markers."""
    matches = STORY_MARKERS.findall(text)
    return min(1.0, len(matches) * 0.4)


def score_contrast(text: str) -> float:
    """Score based on contrast/twist markers."""
    matches = CONTRAST_MARKERS.findall(text)
    return min(1.0, len(matches) * 0.5)


def score_numbers(text: str) -> float:
    """Score based on specific numbers/stats (make claims concrete)."""
    matches = NUMBER_PATTERN.findall(text)
    return min(1.0, len(matches) * 0.35)


def score_pause(prev_end: float | None, seg_start: float) -> float:
    """Score based on silence before segment (emphasis via contrast)."""
    if prev_end is None:
        return 0.0
    gap = seg_start - prev_end
    # 0.5s → 0.2 score; 2s+ → 1.0
    return min(1.0, max(0.0, (gap - 0.3) / 1.8))


def dominant_hook_type(signals: dict) -> str:
    """Return the primary hook type based on highest contributing signal."""
    ordered = sorted(
        [(k, v) for k, v in signals.items() if v > 0],
        key=lambda x: x[1] * WEIGHTS.get(x[0], 0),
        reverse=True,
    )
    if not ordered:
        return 'highlight'
    top = ordered[0][0]
    return {
        'hook_words': 'value_bomb',
        'energy': 'high_energy',
        'question': 'question_hook',
        'story': 'story_moment',
        'contrast': 'contrast_reveal',
        'numbers': 'data_point',
        'pause': 'dramatic_pause',
    }.get(top, 'highlight')


def score_segment(seg: Segment, prev_end: float | None) -> tuple[float, dict]:
    """Score a single segment, return (composite_score, signals_dict)."""
    text = seg.text
    words = seg.words
    duration = seg.end - seg.start

    raw = {
        'hook_words': score_hook_words(text),
        'energy':     score_energy(words, duration),
        'question':   score_question(text),
        'story':      score_story(text),
        'contrast':   score_contrast(text),
        'numbers':    score_numbers(text),
        'pause':      score_pause(prev_end, seg.start),
    }

    composite = sum(raw[k] * WEIGHTS[k] for k in raw)
    return composite, raw


def extend_window(
    anchor_idx: int,
    segments: list[Segment],
    min_dur: float = 20.0,
    max_dur: float = 90.0,
    target_dur: float = 45.0,
) -> tuple[float, float, str]:
    """
    Extend a scored anchor segment into a full clip window.
    Grows backward/forward to hit target_dur while staying in min_dur–max_dur.
    Returns (start_sec, end_sec, transcript_excerpt).
    """
    anchor = segments[anchor_idx]
    clip_start = anchor.start
    clip_end = anchor.end
    dur = clip_end - clip_start

    # Grow backward first (for context / hook setup)
    i = anchor_idx - 1
    while i >= 0 and (clip_start - segments[i].start) <= (target_dur * 0.4):
        clip_start = segments[i].start
        dur = clip_end - clip_start
        i -= 1

    # Grow forward to reach target
    i = anchor_idx + 1
    while i < len(segments) and dur < target_dur:
        candidate_end = segments[i].end
        if candidate_end - clip_start > max_dur:
            break
        clip_end = candidate_end
        dur = clip_end - clip_start
        i += 1

    # If still too short, grow backward more
    i = anchor_idx - 1
    while i >= 0 and dur < min_dur:
        clip_start = segments[i].start
        dur = clip_end - clip_start
        i -= 1

    # Clamp
    dur = clip_end - clip_start
    if dur < min_dur:
        clip_end = min(clip_start + min_dur, segments[-1].end)
    if dur > max_dur:
        clip_end = clip_start + max_dur

    # Extract excerpt (first 200 chars of window)
    window_segs = [s for s in segments if s.start >= clip_start and s.end <= clip_end + 1]
    excerpt = ' '.join(s.text for s in window_segs)[:200].strip()

    return round(clip_start, 2), round(clip_end, 2), excerpt


def select_top_clips(
    segments: list[Segment],
    n: int = 3,
    min_gap_sec: float = 30.0,
) -> list[ScoredWindow]:
    """
    Score all segments, pick top N non-overlapping windows.
    min_gap_sec: minimum seconds between clip start points.
    """
    scored: list[tuple[float, int, dict]] = []  # (score, seg_idx, signals)
    prev_end = None

    for i, seg in enumerate(segments):
        score, signals = score_segment(seg, prev_end)
        scored.append((score, i, signals))
        prev_end = seg.end

    # Sort descending by score
    scored.sort(key=lambda x: x[0], reverse=True)

    selected: list[ScoredWindow] = []
    used_starts: list[float] = []

    for score, seg_idx, signals in scored:
        if len(selected) >= n:
            break

        seg = segments[seg_idx]

        # Check non-overlap with already-selected clips
        too_close = any(
            abs(seg.start - s) < min_gap_sec
            for s in used_starts
        )
        if too_close:
            continue

        start, end, excerpt = extend_window(seg_idx, segments)
        hook_type = dominant_hook_type(signals)

        selected.append(ScoredWindow(
            start=start,
            end=end,
            score=round(score, 4),
            signals=signals,
            hook_type=hook_type,
            anchor_segment_idx=seg_idx,
        ))
        used_starts.append(seg.start)

    # Sort by start time for natural ordering
    selected.sort(key=lambda x: x.start)
    return selected


# ── Title + hashtag generation ───────────────────────────────────────────────

TITLE_TEMPLATES = {
    'value_bomb':      [
        'The {topic} secret nobody tells you',
        'Stop making this {topic} mistake',
        '{number} things about {topic} that changed everything',
        'Why {topic} works (and what everyone gets wrong)',
    ],
    'question_hook':   [
        'Answering the biggest {topic} question',
        'Should you {topic}? Here\'s the truth',
        'The {topic} question everyone is afraid to ask',
    ],
    'high_energy':     [
        'This {topic} advice will blow your mind',
        'The {topic} approach that actually works',
        '{topic}: the real story',
    ],
    'story_moment':    [
        'How I went from 0 to results with {topic}',
        'The {topic} moment that changed everything',
        'What really happened when I tried {topic}',
    ],
    'contrast_reveal': [
        'The truth about {topic} (it\'s not what you think)',
        '{topic}: everyone\'s wrong about this',
        'Unpopular opinion about {topic}',
    ],
    'data_point':      [
        '{number}% of people get {topic} wrong',
        'The {topic} numbers that surprised me',
        '{topic} by the numbers',
    ],
    'dramatic_pause':  [
        'The {topic} pause that says everything',
        'A moment of silence for {topic}',
    ],
    'highlight':       [
        'Best moment: {topic}',
        '{topic} — the clip you need to see',
    ],
}

PLATFORM_HASHTAGS = {
    'YouTube Shorts': ['#Shorts', '#YouTubeShorts'],
    'TikTok': ['#TikTok', '#FYP', '#ForYou'],
    'Instagram Reels': ['#Reels', '#InstagramReels'],
    'LinkedIn': ['#LinkedIn', '#LinkedInContent'],
    'Twitter/X': [],
}

NICHE_HASHTAGS = {
    'podcast': ['#Podcast', '#PodcastClip', '#Podcasting'],
    'business': ['#Business', '#Entrepreneur', '#StartupLife'],
    'comedy': ['#Comedy', '#Funny', '#LOL'],
    'fitness': ['#Fitness', '#Health', '#Workout'],
    'tech': ['#Tech', '#AI', '#SoftwareEngineering'],
    'coaching': ['#Coaching', '#PersonalDevelopment', '#GrowthMindset'],
    'education': ['#Learning', '#Education', '#HowTo'],
}


def extract_topic(text: str, max_words: int = 3) -> str:
    """Extract a short topic phrase from text for title templates."""
    # Remove filler words and take first meaningful noun phrase
    stop = {'the', 'a', 'an', 'i', 'we', 'you', 'it', 'is', 'are', 'was',
            'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'shall',
            'to', 'of', 'in', 'on', 'at', 'for', 'by', 'with', 'from',
            'that', 'this', 'my', 'your', 'our', 'their', 'and', 'or', 'but'}
    words = [w.strip('.,!?;:"\'-').lower() for w in text.split()[:30] if w.isalpha()]
    meaningful = [w for w in words if w not in stop and len(w) > 2]
    return ' '.join(meaningful[:max_words]) if meaningful else 'this'


def extract_number(text: str) -> str:
    """Find first number in text for template substitution."""
    m = re.search(r'\b(\d+(?:\.\d+)?)\s*(%|x|times|percent)?\b', text)
    if m:
        return m.group(0)
    return '3'


def generate_title(hook_type: str, excerpt: str) -> str:
    import random
    templates = TITLE_TEMPLATES.get(hook_type, TITLE_TEMPLATES['highlight'])
    template = random.choice(templates)
    topic = extract_topic(excerpt)
    number = extract_number(excerpt)
    return template.replace('{topic}', topic).replace('{number}', number).title()


def generate_hashtags(platform: str, hook_type: str, excerpt: str) -> list[str]:
    tags = []
    tags += PLATFORM_HASHTAGS.get(platform, [])
    # Detect niche from excerpt
    excerpt_lower = excerpt.lower()
    for niche, niche_tags in NICHE_HASHTAGS.items():
        if niche in excerpt_lower or any(re.search(rf'\b{niche}\b', excerpt_lower) for _ in [1]):
            tags += niche_tags[:2]
            break
    # Generic engaging tags
    tags += ['#ClipSpark', '#ContentCreator']
    return tags[:8]


# ── Main processing ───────────────────────────────────────────────────────────

def process_job(job: dict):
    job_id = job['id']
    asset_id = job.get('asset_id') or job.get('media_asset_id')
    user_id = job['user_id']
    clips_requested = job.get('clips_requested', 3)
    target_platforms = job.get('target_platforms') or ['YouTube Shorts']
    template_id = job.get('template_id', 'podcast-pro-v02')

    if isinstance(target_platforms, str):
        target_platforms = json.loads(target_platforms)

    log.info(f'Scoring: job={job_id} clips={clips_requested} platforms={target_platforms}')
    update_job_status(job_id, 'scoring')

    # Load transcript
    transcript = fetch_transcript(asset_id)
    if not transcript:
        log.error(f'No transcript found for asset {asset_id}')
        update_job_status(job_id, 'failed', {'error_msg': 'No transcript available for scoring'})
        return

    raw_segments = transcript.get('segments')
    if isinstance(raw_segments, str):
        raw_segments = json.loads(raw_segments)

    if not raw_segments:
        log.error(f'Empty segments in transcript for asset {asset_id}')
        update_job_status(job_id, 'failed', {'error_msg': 'Transcript has no segments'})
        return

    # Build Segment objects
    segments = []
    for seg in raw_segments:
        words = seg.get('words', [])
        if isinstance(words, str):
            words = json.loads(words)
        segments.append(Segment(
            idx=int(seg.get('id', 0)),
            start=float(seg.get('start', 0)),
            end=float(seg.get('end', 0)),
            text=str(seg.get('text', '')).strip(),
            words=words,
        ))

    # Filter out empty/very short segments
    segments = [s for s in segments if len(s.text.strip()) > 10 and s.end > s.start]

    if not segments:
        log.error(f'No usable segments after filtering')
        update_job_status(job_id, 'failed', {'error_msg': 'No speakable segments found in transcript'})
        return

    log.info(f'Scoring {len(segments)} segments for {clips_requested} clips...')

    # Run scorer
    top_clips = select_top_clips(segments, n=clips_requested, min_gap_sec=25.0)

    if not top_clips:
        log.error('Scorer produced no clips')
        update_job_status(job_id, 'failed', {'error_msg': 'Scorer produced no clip candidates'})
        return

    log.info(f'Selected {len(top_clips)} clips:')
    for i, clip in enumerate(top_clips):
        log.info(f'  [{i+1}] {clip.start:.1f}s–{clip.end:.1f}s score={clip.score:.3f} hook={clip.hook_type}')

    # Write clip_outputs rows (one per clip × platform)
    # For MVP: create one output per clip, with platforms as metadata
    primary_platform = target_platforms[0] if target_platforms else 'YouTube Shorts'
    created_ids = []

    for i, clip in enumerate(top_clips):
        # Find excerpt from segments
        window_segs = [s for s in segments if s.start >= clip.start - 0.5 and s.end <= clip.end + 0.5]
        excerpt = ' '.join(s.text for s in window_segs)[:250].strip()
        if not excerpt:
            excerpt = segments[min(clip.anchor_segment_idx, len(segments)-1)].text[:250]

        # Generate title + hashtags (use enhanced module if available)
        if _HAS_TITLE_MODULE:
            kws = _extract_kws(excerpt, top_n=15)
            variants = _gen_title_variants(excerpt, clip.hook_type, kws, n=3)
            title = variants[0]['title'] if variants else generate_title(clip.hook_type, excerpt)
            hashtags = _gen_hashtags(primary_platform, clip.hook_type, excerpt, kws, max_tags=10)
        else:
            title = generate_title(clip.hook_type, excerpt)
            hashtags = generate_hashtags(primary_platform, clip.hook_type, excerpt)

        row = {
            'job_id': job_id,
            'user_id': user_id,
            'asset_id': asset_id,
            'clip_index': i + 1,
            'platform': primary_platform,
            'template_id': template_id,
            'source_start_sec': clip.start,
            'source_end_sec': clip.end,
            'duration_sec': round(clip.end - clip.start, 2),
            'heuristic_score': clip.score,
            'heuristic_signals': json.dumps({k: round(v, 4) for k, v in clip.signals.items()}),
            'hook_type': clip.hook_type,
            'title': title,
            'hashtags': json.dumps(hashtags),
            'transcript_excerpt': excerpt,
            'render_status': 'pending',
        }

        try:
            created = sb_insert('clip_outputs', row)
            created_ids.append(created['id'])
            log.info(f'  Created clip_output {created["id"]}: {title[:50]}')
        except Exception as e:
            log.error(f'  Failed to insert clip {i+1}: {e}')

    if not created_ids:
        update_job_status(job_id, 'failed', {'error_msg': 'Failed to write any clip_outputs'})
        return

    # Advance job → rendering
    update_job_status(job_id, 'rendering', {
        'scoring_done_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    })
    log.info(f'Job {job_id}: {len(created_ids)} clips scored → rendering')


def poll_loop(once: bool = False):
    log.info(f'Scoring worker starting. Version: {SCORER_VERSION}')
    while True:
        jobs = fetch_scoring_jobs(limit=5)
        if jobs:
            log.info(f'Found {len(jobs)} job(s) to score')
            for job in jobs:
                try:
                    process_job(job)
                except Exception as e:
                    log.error(f'Unhandled error for job {job.get("id")}: {e}', exc_info=True)
        else:
            log.debug('No scoring jobs, sleeping...')

        if once:
            break
        time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    if not SERVICE_ROLE_KEY:
        log.error('SUPABASE_SERVICE_ROLE_KEY not set')
        sys.exit(1)

    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()
    poll_loop(once=args.once)
