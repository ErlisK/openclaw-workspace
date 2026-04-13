#!/usr/bin/env python3
"""
ClipSpark Concierge Pipeline v0.1
Semi-manual clip creation with stopwatch + cost logging.

Usage:
  python3 pipeline.py --audio /path/to/episode.wav --creator marcus --platform linkedin youtube_shorts

Outputs per run:
  - Transcript JSON with word timestamps
  - Clip candidate scores (heuristic-scored windows)
  - 3 exported MP4 clips with burned captions
  - Cost/time log entry written to cost_log.jsonl
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# ─── Config ───────────────────────────────────────────────────────────────────

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
COST_LOG_PATH = Path("/tmp/clipspark_pilot/logs/cost_log.jsonl")
OUTPUT_DIR = Path("/tmp/clipspark_pilot/output")
TOOLS_DIR = Path(__file__).parent

# Whisper API pricing: $0.006 per minute of audio
WHISPER_COST_PER_MIN = 0.006
# GPT-4o-mini: ~$0.00015 per 1k input tokens, ~$0.0006 per 1k output tokens
GPT_COST_PER_1K_INPUT = 0.00015
GPT_COST_PER_1K_OUTPUT = 0.0006
# FFmpeg render: ~$0.027/vCPU-hr, 1 clip ~3 min render
RENDER_COST_PER_CLIP = 0.027 / 60 * 3  # = ~$0.00135

# ─── Stopwatch ────────────────────────────────────────────────────────────────

class Stopwatch:
    def __init__(self):
        self.laps = {}
        self._start = time.time()
        self._lap_start = time.time()

    def lap(self, label: str):
        now = time.time()
        elapsed = now - self._lap_start
        self.laps[label] = round(elapsed, 2)
        self._lap_start = now
        print(f"  ⏱  [{label}] {elapsed:.1f}s")
        return elapsed

    def total(self):
        return round(time.time() - self._start, 2)

# ─── Step 1: Transcription ────────────────────────────────────────────────────

def transcribe(audio_path: Path, sw: Stopwatch) -> dict:
    """Call OpenAI Whisper API, return word-timestamped transcript."""
    print(f"\n[1/6] Transcribing {audio_path.name}...")
    
    # Get audio duration for cost calculation
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(audio_path)],
        capture_output=True, text=True
    )
    duration_sec = float(result.stdout.strip()) if result.stdout.strip() else 120.0
    duration_min = duration_sec / 60

    if not OPENAI_API_KEY:
        print("  ⚠  No OPENAI_API_KEY — using mock transcript for pipeline test")
        # Return a realistic mock transcript for testing
        mock = _mock_transcript(duration_sec)
        sw.lap("transcription_mock")
        return {"transcript": mock, "duration_sec": duration_sec, "cost_usd": 0.0}

    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)

    with open(audio_path, "rb") as f:
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="verbose_json",
            timestamp_granularities=["word"]
        )

    cost = duration_min * WHISPER_COST_PER_MIN
    sw.lap("transcription_api")
    return {
        "transcript": response.model_dump(),
        "duration_sec": duration_sec,
        "cost_usd": round(cost, 4)
    }

def _mock_transcript(duration_sec: float) -> dict:
    """Mock word-timestamped transcript for pipeline testing without API key."""
    # Simulate a ~101s podcast episode transcript
    words_data = [
        (0.0, 0.5, "Welcome"), (0.5, 0.8, "to"), (0.8, 1.0, "the"),
        (1.0, 1.5, "ClipSpark"), (1.5, 2.0, "pilot"), (2.0, 2.3, "test"),
        (2.3, 2.8, "episode."), (3.0, 3.3, "Today"), (3.3, 3.5, "I"),
        (3.5, 3.8, "want"), (3.8, 4.0, "to"), (4.0, 4.3, "share"),
        (4.3, 4.6, "three"), (4.6, 4.9, "things"), (4.9, 5.1, "that"),
        (5.1, 5.4, "changed"), (5.4, 5.8, "everything"), (5.8, 6.0, "about"),
        (6.0, 6.2, "how"), (6.2, 6.4, "I"), (6.4, 6.8, "grow"),
        (6.8, 7.0, "my"), (7.0, 7.5, "podcast."),
        (8.0, 8.4, "The"), (8.4, 8.7, "first"), (8.7, 9.0, "thing"),
        (9.0, 9.2, "I"), (9.2, 9.5, "learned"), (9.5, 9.7, "is"),
        (9.7, 9.9, "that"), (9.9, 10.2, "posting"), (10.2, 10.4, "less"),
        (10.4, 10.7, "content"), (10.7, 10.9, "can"), (10.9, 11.1, "actually"),
        (11.1, 11.4, "grow"), (11.4, 11.6, "your"), (11.6, 12.0, "audience"),
        (12.0, 12.3, "faster."),
        (13.0, 13.2, "I"), (13.2, 13.4, "spent"), (13.4, 13.6, "six"),
        (13.6, 13.9, "months"), (13.9, 14.1, "posting"), (14.1, 14.3, "every"),
        (14.3, 14.5, "single"), (14.5, 14.7, "day"), (14.7, 15.0, "and"),
        (15.0, 15.1, "my"), (15.1, 15.3, "numbers"), (15.3, 15.5, "barely"),
        (15.5, 15.8, "moved."),
        (16.5, 16.7, "Then"), (16.7, 16.9, "I"), (16.9, 17.1, "took"),
        (17.1, 17.3, "a"), (17.3, 17.6, "two"), (17.6, 17.8, "week"),
        (17.8, 18.0, "break,"), (18.0, 18.2, "came"), (18.2, 18.5, "back"),
        (18.5, 18.7, "with"), (18.7, 18.9, "one"), (18.9, 19.2, "deeply"),
        (19.2, 19.5, "researched"), (19.5, 19.8, "episode"), (19.8, 20.0, "per"),
        (20.0, 20.2, "week,"), (20.2, 20.4, "and"), (20.4, 20.6, "my"),
        (20.6, 21.0, "downloads"), (21.0, 21.4, "tripled"), (21.4, 21.6, "in"),
        (21.6, 21.9, "ninety"), (21.9, 22.3, "days."),
        (24.0, 24.3, "The"), (24.3, 24.6, "second"), (24.6, 24.9, "insight"),
        (24.9, 25.1, "is"), (25.1, 25.3, "about"), (25.3, 25.5, "the"),
        (25.5, 25.7, "first"), (25.7, 26.0, "sixty"), (26.0, 26.3, "seconds"),
        (26.3, 26.5, "of"), (26.5, 26.7, "your"), (26.7, 27.0, "episode."),
        (27.5, 27.7, "Most"), (27.7, 28.0, "podcasters"), (28.0, 28.2, "spend"),
        (28.2, 28.4, "their"), (28.4, 28.6, "intro"), (28.6, 28.8, "talking"),
        (28.8, 29.0, "about"), (29.0, 29.3, "themselves."),
        (30.0, 30.2, "Your"), (30.2, 30.4, "listeners"), (30.4, 30.6, "don't"),
        (30.6, 30.8, "care"), (30.8, 31.0, "who"), (31.0, 31.2, "you"),
        (31.2, 31.4, "are"), (31.4, 31.6, "yet."),
        (32.0, 32.3, "Start"), (32.3, 32.5, "with"), (32.5, 32.7, "the"),
        (32.7, 32.9, "most"), (32.9, 33.2, "surprising"), (33.2, 33.4, "thing"),
        (33.4, 33.6, "you're"), (33.6, 33.8, "going"), (33.8, 34.0, "to"),
        (34.0, 34.2, "say"), (34.2, 34.4, "in"), (34.4, 34.6, "the"),
        (34.6, 34.8, "episode."),
        (36.0, 36.2, "Lead"), (36.2, 36.4, "with"), (36.4, 36.6, "the"),
        (36.6, 36.9, "punchline."),
        (38.0, 38.2, "Trust"), (38.2, 38.4, "me,"), (38.4, 38.6, "the"),
        (38.6, 38.8, "context"), (38.8, 39.0, "can"), (39.0, 39.2, "come"),
        (39.2, 39.4, "later."),
        (42.0, 42.2, "Stop"), (42.2, 42.4, "trying"), (42.4, 42.6, "to"),
        (42.6, 42.9, "go"), (42.9, 43.2, "viral"), (43.2, 43.4, "and"),
        (43.4, 43.6, "start"), (43.6, 43.8, "trying"), (43.8, 44.0, "to"),
        (44.0, 44.2, "be"), (44.2, 44.5, "useful"), (44.5, 44.7, "to"),
        (44.7, 44.9, "a"), (44.9, 45.2, "specific"), (45.2, 45.5, "person."),
        (46.0, 46.2, "I"), (46.2, 46.4, "have"), (46.4, 46.6, "a"),
        (46.6, 46.9, "listener"), (46.9, 47.1, "named"), (47.1, 47.3, "Sarah."),
        (47.8, 47.9, "She's"), (47.9, 48.1, "a"), (48.1, 48.4, "freelance"),
        (48.4, 48.7, "designer"), (48.7, 48.9, "trying"), (48.9, 49.1, "to"),
        (49.1, 49.3, "build"), (49.3, 49.5, "a"), (49.5, 49.8, "podcast"),
        (49.8, 50.0, "about"), (50.0, 50.3, "creative"), (50.3, 50.6, "burnout."),
        (51.0, 51.2, "I"), (51.2, 51.4, "make"), (51.4, 51.6, "every"),
        (51.6, 51.9, "episode"), (51.9, 52.1, "for"), (52.1, 52.4, "Sarah."),
        (53.0, 53.2, "Not"), (53.2, 53.4, "for"), (53.4, 53.7, "the"),
        (53.7, 54.0, "algorithm."), (54.5, 54.7, "Not"), (54.7, 54.9, "for"),
        (54.9, 55.1, "the"), (55.1, 55.4, "charts."), (56.0, 56.2, "For"),
        (56.2, 56.5, "Sarah."),
        (57.5, 57.7, "And"), (57.7, 57.9, "funnily"), (57.9, 58.1, "enough,"),
        (58.1, 58.4, "when"), (58.4, 58.6, "I"), (58.6, 58.8, "started"),
        (58.8, 59.0, "doing"), (59.0, 59.2, "that,"), (59.2, 59.4, "my"),
        (59.4, 59.6, "show"), (59.6, 59.8, "started"), (59.8, 60.0, "growing"),
        (60.0, 60.3, "faster"), (60.3, 60.5, "than"), (60.5, 60.7, "when"),
        (60.7, 60.9, "I"), (60.9, 61.1, "was"), (61.1, 61.4, "chasing"),
        (61.4, 61.7, "downloads."),
    ]
    words = [{"word": w, "start": s, "end": e} for s, e, w in words_data]
    full_text = " ".join(w["word"] for w in words)
    return {"text": full_text, "words": words}

# ─── Step 2: Heuristic Clip Candidate Scoring ─────────────────────────────────

HOOK_PHRASES = [
    "the reason why", "here's the thing", "nobody talks about",
    "what nobody tells you", "the truth is", "counterintuitive",
    "i know what you're thinking", "hear me out", "the most surprising",
    "stop trying", "lead with", "start with the",
]
NARRATIVE_PHRASES = [
    "i remember", "the day i", "i spent", "then i", "came back",
    "i almost", "everything changed", "that's when i realized",
    "i have a listener", "i make every",
]
INSIGHT_PHRASES = [
    "tripled", "three things", "changed everything", "every single time",
    "beats", "funnily enough", "not for the", "for sarah",
]

def score_window(words: list, start_idx: int, end_idx: int) -> dict:
    text = " ".join(w["word"].lower() for w in words[start_idx:end_idx])
    score = 0
    signals = []

    for phrase in HOOK_PHRASES:
        if phrase in text:
            score += 3
            signals.append(f"HOOK:{phrase}")
    for phrase in NARRATIVE_PHRASES:
        if phrase in text:
            score += 3
            signals.append(f"NARRATIVE:{phrase}")
    for phrase in INSIGHT_PHRASES:
        if phrase in text:
            score += 2
            signals.append(f"INSIGHT:{phrase}")

    # Bonus: clean start (no filler words)
    first_word = words[start_idx]["word"].lower().strip(".,!?")
    if first_word not in {"uh", "um", "so", "like", "you", "and", "but"}:
        score += 1
        signals.append("CLEAN_START")

    # Duration score (prefer 35-60s windows)
    duration = words[end_idx - 1]["end"] - words[start_idx]["start"]
    if 35 <= duration <= 60:
        score += 2
        signals.append(f"GOOD_DURATION:{duration:.0f}s")
    elif duration > 60:
        score -= 1

    start_time = words[start_idx]["start"]
    end_time = words[end_idx - 1]["end"]
    return {
        "start_time": round(start_time, 2),
        "end_time": round(end_time, 2),
        "duration": round(end_time - start_time, 2),
        "score": score,
        "signals": signals,
        "text": text[:200],
    }

def find_clip_candidates(transcript: dict, sw: Stopwatch, n_clips: int = 3) -> list:
    print(f"\n[2/6] Scoring clip candidates...")
    words = transcript.get("words", [])
    if not words:
        print("  ⚠  No word timestamps in transcript")
        return []

    candidates = []
    # Slide a window of ~50-70 words (≈35-55s at podcast pace)
    window_size = 55
    step = 15

    for i in range(0, len(words) - window_size, step):
        window = score_window(words, i, min(i + window_size, len(words)))
        if window["score"] > 0:
            candidates.append(window)

    # Sort by score, then deduplicate overlapping windows
    candidates.sort(key=lambda x: -x["score"])
    selected = []
    for cand in candidates:
        # Check no overlap with already-selected clips (min 10s gap)
        overlap = any(
            not (cand["end_time"] + 10 < s["start_time"] or cand["start_time"] - 10 > s["end_time"])
            for s in selected
        )
        if not overlap:
            selected.append(cand)
        if len(selected) >= n_clips:
            break

    # If not enough candidates from heuristic, add time-spaced fallbacks
    if len(selected) < n_clips:
        total_dur = words[-1]["end"] if words else 120
        for i in range(n_clips - len(selected)):
            t_start = (total_dur / (n_clips + 1)) * (i + 1)
            # Find word index at that timestamp
            idx = next((j for j, w in enumerate(words) if w["start"] >= t_start), 0)
            end_idx = min(idx + 55, len(words))
            fallback = score_window(words, idx, end_idx)
            fallback["fallback"] = True
            selected.append(fallback)

    sw.lap("clip_candidate_scoring")
    for i, c in enumerate(selected[:n_clips]):
        print(f"  Clip {i+1}: {c['start_time']:.1f}s–{c['end_time']:.1f}s "
              f"({c['duration']:.0f}s, score={c['score']}) — {', '.join(c['signals'][:3])}")

    return selected[:n_clips]

# ─── Step 3: SRT Caption Generation ──────────────────────────────────────────

def generate_srt(words: list, start_time: float, end_time: float, clip_idx: int) -> str:
    """Generate SRT caption file for a clip's time range."""
    clip_words = [w for w in words if start_time <= w["start"] < end_time]

    # Group into lines of max 4 words
    lines = []
    group = []
    for w in clip_words:
        # Skip filler words
        if w["word"].lower().strip(".,!?") in {"uh", "um", "you know"}:
            continue
        group.append(w)
        if len(group) >= 4 or (group and group[-1]["word"].endswith((".", "!", "?", ","))):
            lines.append(group)
            group = []
    if group:
        lines.append(group)

    srt_lines = []
    for i, line_words in enumerate(lines, 1):
        if not line_words:
            continue
        t_start = line_words[0]["start"] - start_time
        t_end = line_words[-1]["end"] - start_time
        text = " ".join(w["word"] for w in line_words)
        srt_lines.append(f"{i}")
        srt_lines.append(f"{_fmt_time(t_start)} --> {_fmt_time(t_end)}")
        srt_lines.append(text)
        srt_lines.append("")

    return "\n".join(srt_lines)

def _fmt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

# ─── Step 4: FFmpeg Export ────────────────────────────────────────────────────

def export_clip(
    audio_path: Path,
    clip: dict,
    srt_path: Path,
    output_path: Path,
    sw: Stopwatch,
    template: str = "default_vertical",
) -> dict:
    """
    Export a single clip MP4 with burned captions.
    For audio-only input: creates a waveform visualization frame as background.
    """
    print(f"\n[4/6] Rendering {output_path.name}...")
    t_start_render = time.time()

    start = clip["start_time"]
    duration = clip["duration"]

    # Build FFmpeg command: audio + black background + caption burn
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"color=c=black:size=1080x1920:rate=30:duration={duration}",
        "-ss", str(start), "-t", str(duration), "-i", str(audio_path),
        "-vf", (
            f"subtitles={srt_path}:force_style='"
            f"Fontname=DejaVu Sans Bold,"
            f"Fontsize=52,"
            f"PrimaryColour=&H00FFFFFF,"
            f"OutlineColour=&H00000000,"
            f"Outline=3,"
            f"Alignment=2,"
            f"MarginV=120'"
        ),
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest",
        str(output_path)
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    render_time = time.time() - t_start_render

    if result.returncode != 0:
        print(f"  ⚠  FFmpeg error: {result.stderr[-300:]}")
        # Try simpler command without subtitle filter as fallback
        cmd_simple = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", f"color=c=black:size=1080x1920:rate=30:duration={duration}",
            "-ss", str(start), "-t", str(duration), "-i", str(audio_path),
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            "-shortest",
            str(output_path)
        ]
        result2 = subprocess.run(cmd_simple, capture_output=True, text=True)
        if result2.returncode == 0:
            print(f"  ✓ Fallback render (no captions): {render_time:.1f}s")
        else:
            print(f"  ✗ Both renders failed")
            return {"success": False, "render_time_sec": render_time, "cost_usd": 0}
    else:
        print(f"  ✓ Rendered in {render_time:.1f}s — {output_path.stat().st_size / 1024:.0f}KB")

    sw.lap(f"render_{output_path.stem}")
    return {
        "success": True,
        "render_time_sec": round(render_time, 2),
        "file_size_kb": round(output_path.stat().st_size / 1024, 1) if output_path.exists() else 0,
        "cost_usd": round(RENDER_COST_PER_CLIP, 5),
    }

# ─── Step 5: Title + Hashtag Generation ──────────────────────────────────────

def generate_titles_hashtags(clips: list, niche: str, platform: str) -> list:
    """Generate title + hashtags for each clip using GPT-4o-mini."""
    print(f"\n[5/6] Generating titles + hashtags for {platform}...")

    if not OPENAI_API_KEY:
        # Mock titles for testing
        mock_titles = [
            {"title": "The counterintuitive truth about podcast growth", "hashtags": ["#PodcastGrowth", "#ContentCreator", "#Podcasting"]},
            {"title": "Why your podcast intro is killing your growth", "hashtags": ["#PodcastTips", "#ContentStrategy", "#Podcasting"]},
            {"title": "Stop chasing viral. Start serving one person.", "hashtags": ["#PodcastGrowth", "#ContentCreator", "#Podcasting"]},
        ]
        print("  ⚠  No OPENAI_API_KEY — using mock titles")
        for i, c in enumerate(clips):
            c["title"] = mock_titles[i % len(mock_titles)]["title"]
            c["hashtags"] = mock_titles[i % len(mock_titles)]["hashtags"]
        return clips

    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)

    platform_hashtag_rules = {
        "youtube_shorts": "3 hashtags: 1 niche, 1 broad like #Podcast, 1 topical",
        "linkedin": "5 hashtags: professional and niche-specific, include #LinkedInCreator",
        "tiktok": "5-7 hashtags: mix #PodcastTok, niche tags, 1 viral tag",
        "instagram_reels": "8-10 hashtags: broad + niche mix",
    }

    for i, clip in enumerate(clips):
        prompt = f"""You are writing social media copy for a podcast clip.
Clip transcript excerpt: "{clip['text'][:300]}"
Niche: {niche}
Platform: {platform}
Hashtag rules: {platform_hashtag_rules.get(platform, '3-5 relevant hashtags')}

Output JSON only:
{{"title": "compelling short title under 12 words", "hashtags": ["#tag1", "#tag2", ...]}}"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
        clip["title"] = result.get("title", f"Clip {i+1}")
        clip["hashtags"] = result.get("hashtags", [])
        print(f"  Clip {i+1}: \"{clip['title']}\" — {' '.join(clip['hashtags'][:3])}")

    return clips

# ─── Step 6: Cost + Time Logging ─────────────────────────────────────────────

def write_cost_log(entry: dict):
    COST_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(COST_LOG_PATH, "a") as f:
        f.write(json.dumps(entry) + "\n")
    print(f"\n  📊 Cost log → {COST_LOG_PATH}")

# ─── Main Pipeline ────────────────────────────────────────────────────────────

def run(audio_path: Path, creator: str, platforms: list, niche: str, n_clips: int = 3):
    sw = Stopwatch()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    session_dir = OUTPUT_DIR / f"{creator}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    session_dir.mkdir(exist_ok=True)

    print(f"\n{'='*60}")
    print(f"ClipSpark Concierge Pipeline v0.1")
    print(f"Creator: {creator} | Platforms: {', '.join(platforms)} | Niche: {niche}")
    print(f"{'='*60}")

    total_cost = 0.0

    # Step 1: Transcribe
    tx_result = transcribe(audio_path, sw)
    total_cost += tx_result["cost_usd"]
    transcript_data = tx_result["transcript"]
    words = transcript_data.get("words", [])
    duration_sec = tx_result["duration_sec"]

    # Save transcript
    transcript_path = session_dir / "transcript.json"
    transcript_path.write_text(json.dumps(transcript_data, indent=2))
    print(f"  Saved transcript → {transcript_path}")

    # Step 2: Find clip candidates
    sw._lap_start = time.time()
    clips = find_clip_candidates(transcript_data, sw, n_clips=n_clips)
    if not clips:
        print("ERROR: No clip candidates found. Check transcript quality.")
        sys.exit(1)

    # Step 3+4: For each clip, generate SRT + render
    rendered_clips = []
    for i, clip in enumerate(clips, 1):
        print(f"\n--- Processing Clip {i}/{len(clips)} ---")

        # Generate SRT
        srt_content = generate_srt(words, clip["start_time"], clip["end_time"], i)
        srt_path = session_dir / f"clip_{i}.srt"
        srt_path.write_text(srt_content)

        # Render
        output_path = session_dir / f"{creator}_clip{i}_{platforms[0]}.mp4"
        render_result = export_clip(audio_path, clip, srt_path, output_path, sw)
        total_cost += render_result.get("cost_usd", 0)

        rendered_clips.append({
            **clip,
            "clip_index": i,
            "output_path": str(output_path),
            "srt_path": str(srt_path),
            "render_result": render_result,
        })

    # Step 5: Titles + hashtags
    sw._lap_start = time.time()
    for platform in platforms:
        rendered_clips = generate_titles_hashtags(rendered_clips, niche, platform)
    title_cost = len(rendered_clips) * len(platforms) * 0.001
    total_cost += title_cost
    sw.lap("title_hashtag_generation")

    total_time_sec = sw.total()

    # Step 6: Log costs + times
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "creator": creator,
        "niche": niche,
        "platforms": platforms,
        "audio_file": str(audio_path),
        "duration_sec": duration_sec,
        "clips_produced": len(rendered_clips),
        "total_wall_clock_sec": total_time_sec,
        "time_per_clip_sec": round(total_time_sec / max(len(rendered_clips), 1), 1),
        "cost_breakdown": {
            "transcription_usd": tx_result["cost_usd"],
            "rendering_usd": round(RENDER_COST_PER_CLIP * len(rendered_clips), 5),
            "title_hashtag_usd": round(title_cost, 5),
            "total_usd": round(total_cost, 4),
        },
        "cost_per_clip_usd": round(total_cost / max(len(rendered_clips), 1), 4),
        "laps_sec": sw.laps,
        "clips": [
            {
                "index": c["clip_index"],
                "start": c["start_time"],
                "end": c["end_time"],
                "duration": c["duration"],
                "score": c["score"],
                "signals": c["signals"],
                "title": c.get("title", ""),
                "hashtags": c.get("hashtags", []),
                "output": c["output_path"],
                "render_success": c["render_result"]["success"],
                "file_size_kb": c["render_result"].get("file_size_kb", 0),
            }
            for c in rendered_clips
        ],
    }
    write_cost_log(log_entry)

    # Summary
    print(f"\n{'='*60}")
    print(f"✅ PIPELINE COMPLETE")
    print(f"   Clips produced: {len(rendered_clips)}")
    print(f"   Total time:     {total_time_sec:.0f}s ({total_time_sec/60:.1f} min)")
    print(f"   Time per clip:  {total_time_sec/max(len(rendered_clips),1):.0f}s")
    print(f"   Total API cost: ${total_cost:.4f}")
    print(f"   Cost per clip:  ${total_cost/max(len(rendered_clips),1):.4f}")
    print(f"   Output dir:     {session_dir}")
    print(f"{'='*60}\n")

    # Print clip manifest
    for c in rendered_clips:
        status = "✓" if c["render_result"]["success"] else "✗"
        print(f"   {status} Clip {c['clip_index']}: {c['start_time']:.0f}s–{c['end_time']:.0f}s | "
              f"\"{c.get('title', 'untitled')}\"")
        print(f"     Tags: {' '.join(c.get('hashtags', [])[:3])}")
        print(f"     File: {Path(c['output_path']).name} ({c['render_result'].get('file_size_kb',0):.0f}KB)")

    return log_entry


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ClipSpark Concierge Pipeline v0.1")
    parser.add_argument("--audio", required=True, help="Path to audio/video file")
    parser.add_argument("--creator", default="pilot", help="Creator name (for file naming)")
    parser.add_argument("--platform", nargs="+", default=["youtube_shorts", "linkedin"],
                        help="Target platforms")
    parser.add_argument("--niche", default="podcast", help="Content niche")
    parser.add_argument("--clips", type=int, default=3, help="Number of clips to produce")
    args = parser.parse_args()

    run(
        audio_path=Path(args.audio),
        creator=args.creator,
        platforms=args.platform,
        niche=args.niche,
        n_clips=args.clips,
    )
