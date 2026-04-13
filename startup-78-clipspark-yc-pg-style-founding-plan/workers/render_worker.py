#!/usr/bin/env python3
"""
ClipSpark Render Worker
========================
Polls Supabase for clip_outputs with render_status='pending'
(belonging to processing_jobs with status='rendering'),
downloads the proxy (or source) audio/video,
trims to the scored window,
burns SRT captions from the transcript,
overlays a 'PREVIEW' watermark,
encodes a 240p low-bandwidth preview,
uploads to the previews bucket,
updates clip_outputs.preview_url + render_status='preview_ready',
and advances the job to 'preview_ready' when all clips are done.

240p settings: 426×240 (9:16 → 135×240), CRF=32, 300kbps cap, AAC 64k
Target file size: ~2–4 MB per 60s clip (fast to load on mobile preview)

Usage:
    python3 render_worker.py [--once] [--dry-run]

Environment:
    SUPABASE_URL                (default: https://twctmwwqxvenvieijmtn.supabase.co)
    SUPABASE_SERVICE_ROLE_KEY   (required)
    WATERMARK_TEXT              (default: 'CLIPSPARK PREVIEW')
    POLL_INTERVAL               (default: 10)
    MAX_PREVIEW_DURATION        (default: 90 seconds)
"""

import os
import sys
import re
import json
import math
import time
import logging
import argparse
import tempfile
import subprocess
import urllib.request
import urllib.parse
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [render_worker] %(levelname)s %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
log = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://twctmwwqxvenvieijmtn.supabase.co')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
WATERMARK_TEXT = os.environ.get('WATERMARK_TEXT', 'CLIPSPARK PREVIEW')
POLL_INTERVAL = int(os.environ.get('POLL_INTERVAL', '10'))
MAX_PREVIEW_DURATION = float(os.environ.get('MAX_PREVIEW_DURATION', '90'))

# 240p preview: landscape (426×240) or portrait/9:16 (135×240)
# We use scale=-2:240 (auto-width, keep aspect, divisible-by-2)
PREVIEW_ENCODE_ARGS = [
    '-vf', 'scale=-2:240',           # 240p, maintain aspect
    '-c:v', 'libx264',
    '-crf', '32',                    # lower quality = smaller file
    '-preset', 'fast',
    '-maxrate', '400k',
    '-bufsize', '800k',
    '-movflags', '+faststart',       # progressive load
    '-c:a', 'aac',
    '-b:a', '64k',
    '-ac', '1',                      # mono audio for preview
    '-ar', '22050',
    '-threads', '2',
]

AUDIO_PREVIEW_ARGS = [
    '-vn',
    '-c:a', 'aac',
    '-b:a', '64k',
    '-ac', '1',
    '-ar', '22050',
]

# Font for drawtext watermark and captions
FONT_PATH = None
for candidate in [
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
]:
    if os.path.exists(candidate):
        FONT_PATH = candidate
        break


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
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())


def sb_patch(table: str, filter_qs: str, payload: dict):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}?{filter_qs}',
        data=data, method='PATCH', headers=sb_headers(),
    )
    with urllib.request.urlopen(req, timeout=15):
        pass


def sb_get_signed_url(path: str, bucket: str, expires: int = 3600) -> str:
    payload = json.dumps({'expiresIn': expires}).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}',
        data=payload, method='POST', headers=sb_headers(),
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        d = json.loads(r.read())
        signed = d.get('signedURL') or d.get('signedUrl', '')
        if signed.startswith('/'):
            return f'{SUPABASE_URL}/storage/v1{signed}'
        return signed


def sb_upload(local_path: str, storage_path: str, bucket: str, content_type: str = 'video/mp4') -> str:
    url = f'{SUPABASE_URL}/storage/v1/object/{bucket}/{storage_path}'
    with open(local_path, 'rb') as f:
        data = f.read()
    req = urllib.request.Request(url, data=data, method='POST', headers={
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': content_type,
        'x-upsert': 'true',
    })
    with urllib.request.urlopen(req, timeout=180) as r:
        json.loads(r.read())
    return storage_path


def sb_get_public_url(path: str, bucket: str) -> str:
    """Return a signed URL valid for 7 days (previews are private)."""
    return sb_get_signed_url(path, bucket, expires=7 * 24 * 3600)


def fetch_pending_clips(limit: int = 5) -> list:
    params = urllib.parse.urlencode({
        'render_status': 'eq.pending',
        'limit': str(limit),
        'order': 'created_at.asc',
    })
    try:
        return sb_get(f'clip_outputs?{params}')
    except Exception as e:
        log.warning(f'fetch_pending_clips: {e}')
        return []


def fetch_asset(asset_id: str) -> dict | None:
    params = urllib.parse.urlencode({'id': f'eq.{asset_id}'})
    try:
        rows = sb_get(f'media_assets?{params}')
        return rows[0] if rows else None
    except Exception as e:
        log.warning(f'fetch_asset: {e}')
        return None


def fetch_transcript(asset_id: str) -> dict | None:
    params = urllib.parse.urlencode({
        'media_asset_id': f'eq.{asset_id}',
        'order': 'created_at.desc',
        'limit': '1',
    })
    try:
        rows = sb_get(f'transcripts?{params}')
        return rows[0] if rows else None
    except Exception as e:
        log.warning(f'fetch_transcript: {e}')
        return None


def check_all_clips_done(job_id: str) -> bool:
    params = urllib.parse.urlencode({
        'job_id': f'eq.{job_id}',
        'render_status': 'neq.preview_ready',
        'limit': '1',
    })
    try:
        rows = sb_get(f'clip_outputs?{params}')
        return len(rows) == 0
    except Exception:
        return False


def advance_job_if_done(job_id: str, user_id: str):
    if check_all_clips_done(job_id):
        now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        sb_patch('processing_jobs', f'id=eq.{job_id}', {
            'status': 'preview_ready',
            'preview_ready_at': now,
            'updated_at': now,
        })
        log.info(f'Job {job_id}: all clips done → preview_ready')


# ── SRT generation ────────────────────────────────────────────────────────────

def srt_timestamp(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int((sec % 1) * 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


def build_srt(word_timings: list, clip_start: float, clip_end: float,
              words_per_caption: int = 6, max_caption_duration: float = 3.0) -> str:
    """
    Build SRT captions from word_timings for a specific clip window.
    Times are offset relative to clip_start (t=0 in the output file).
    """
    # Filter words in window
    window_words = [
        w for w in word_timings
        if w.get('end', 0) > clip_start and w.get('start', 0) < clip_end
    ]

    if not window_words:
        return ''

    captions = []
    idx = 0
    caption_idx = 1

    while idx < len(window_words):
        group = window_words[idx:idx + words_per_caption]
        if not group:
            break

        start = group[0].get('start', clip_start)
        end = group[-1].get('end', start + 2.0)

        # Cap duration
        if end - start > max_caption_duration:
            end = start + max_caption_duration

        # Clamp to clip window
        start = max(clip_start, start)
        end = min(clip_end, end)

        # Offset to clip-relative time
        rel_start = start - clip_start
        rel_end = end - clip_start

        if rel_end <= rel_start:
            idx += words_per_caption
            continue

        text = ' '.join(str(w.get('word', '')).strip() for w in group if w.get('word', '').strip())
        if not text:
            idx += words_per_caption
            continue

        captions.append(
            f'{caption_idx}\n{srt_timestamp(rel_start)} --> {srt_timestamp(rel_end)}\n{text}\n'
        )
        caption_idx += 1
        idx += words_per_caption

    return '\n'.join(captions)


# ── FFmpeg render ─────────────────────────────────────────────────────────────

def download_file(url: str, dest: Path):
    log.info(f'Downloading {url[:80]}...')
    urllib.request.urlretrieve(url, dest)
    size_mb = dest.stat().st_size / 1_048_576
    log.info(f'Downloaded {size_mb:.1f} MB → {dest.name}')


def is_audio_only_file(path: Path) -> bool:
    cmd = ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_streams', str(path)]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        d = json.loads(r.stdout)
        return not any(s.get('codec_type') == 'video' for s in d.get('streams', []))
    except Exception:
        return path.suffix.lower() in ('.mp3', '.m4a', '.aac', '.wav', '.ogg', '.opus')


def render_preview(
    source_path: Path,
    out_path: Path,
    start_sec: float,
    end_sec: float,
    srt_path: Path | None,
    watermark_text: str,
    dry_run: bool = False,
) -> Path:
    """
    Render a 240p watermarked preview clip with burned captions.
    Returns output path.
    """
    duration = min(end_sec - start_sec, MAX_PREVIEW_DURATION)
    audio_only = is_audio_only_file(source_path)

    if audio_only:
        # Audio preview: waveform visualization + captions
        out_audio = out_path.with_suffix('.m4a')
        cmd = [
            'ffmpeg', '-y',
            '-ss', str(start_sec), '-t', str(duration),
            '-i', str(source_path),
            *AUDIO_PREVIEW_ARGS,
            str(out_audio),
        ]
        if not dry_run:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            if result.returncode != 0:
                raise RuntimeError(f'ffmpeg audio preview failed: {result.stderr[-500:]}')
        return out_audio

    # Build video filter chain
    vf_parts = [f'scale=-2:240']

    # Burned-in captions from SRT
    if srt_path and srt_path.exists() and srt_path.stat().st_size > 10:
        # Escape path for ffmpeg filter syntax
        srt_escaped = str(srt_path).replace('\\', '/').replace(':', '\\:').replace("'", "\\'")
        font_args = f':fontsdir=/usr/share/fonts/truetype/liberation' if FONT_PATH else ''
        # subtitles filter: burn SRT into video
        vf_parts.append(
            f"subtitles='{srt_escaped}':force_style='"
            f"FontSize=14,PrimaryColour=&Hffffff,OutlineColour=&H000000,"
            f"BackColour=&H80000000,Bold=1,Alignment=2,MarginV=10"
            f"'"
        )

    # Watermark overlay via drawtext
    if FONT_PATH and watermark_text:
        font_arg = f':fontfile={FONT_PATH}'
        wm = (
            f"drawtext=text='{watermark_text}'"
            f"{font_arg}"
            f":fontsize=10"
            f":fontcolor=white@0.4"
            f":x=(w-text_w)/2"
            f":y=12"
            f":shadowcolor=black@0.4:shadowx=1:shadowy=1"
        )
        vf_parts.append(wm)
    elif watermark_text:
        # drawtext without custom font (use default)
        wm = (
            f"drawtext=text='{watermark_text}'"
            f":fontsize=10"
            f":fontcolor=white@0.4"
            f":x=(w-text_w)/2"
            f":y=12"
        )
        vf_parts.append(wm)

    vf_chain = ','.join(vf_parts)

    out_video = out_path.with_suffix('.mp4')
    cmd = [
        'ffmpeg', '-y',
        '-ss', str(start_sec), '-t', str(duration),
        '-i', str(source_path),
        '-vf', vf_chain,
        '-c:v', 'libx264', '-crf', '32', '-preset', 'fast',
        '-maxrate', '400k', '-bufsize', '800k',
        '-movflags', '+faststart',
        '-c:a', 'aac', '-b:a', '64k', '-ac', '1', '-ar', '22050',
        '-threads', '2',
        str(out_video),
    ]

    log.info(f'ffmpeg render: {start_sec:.1f}s–{start_sec+duration:.1f}s ({duration:.0f}s), vf={vf_chain[:80]}...')

    if not dry_run:
        t0 = time.time()
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            raise RuntimeError(f'ffmpeg render failed: {result.stderr[-800:]}')
        elapsed = time.time() - t0
        size_mb = out_video.stat().st_size / 1_048_576
        log.info(f'Render done in {elapsed:.1f}s → {size_mb:.1f} MB ({out_video.name})')
    else:
        log.info(f'[DRY RUN] Would run: {" ".join(cmd[:12])}...')
        out_video.touch()

    return out_video


# ── Main processing ───────────────────────────────────────────────────────────

def process_clip(clip: dict, dry_run: bool = False):
    clip_id = clip['id']
    job_id = clip['job_id']
    asset_id = clip['asset_id']
    user_id = clip['user_id']
    start_sec = float(clip.get('source_start_sec') or 0)
    end_sec = float(clip.get('source_end_sec') or start_sec + 60)
    clip_index = clip.get('clip_index', 1)
    platform = clip.get('platform', 'YouTube Shorts')

    log.info(f'Rendering clip {clip_id} ({start_sec:.1f}s–{end_sec:.1f}s, platform={platform})')

    # Mark as rendering
    sb_patch('clip_outputs', f'id=eq.{clip_id}', {
        'render_status': 'rendering',
        'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    })

    asset = fetch_asset(asset_id)
    if not asset:
        raise ValueError(f'Asset {asset_id} not found')

    transcript = fetch_transcript(asset_id)

    with tempfile.TemporaryDirectory(prefix='clipspark_render_') as tmpdir:
        tmp = Path(tmpdir)

        # Step 1: Download source (prefer proxy, fall back to original)
        proxy_path = asset.get('proxy_path')
        storage_path = asset.get('storage_path')
        source_url = asset.get('source_url')

        source_file: Path | None = None

        if proxy_path:
            url = sb_get_signed_url(proxy_path, 'previews')
            ext = proxy_path.rsplit('.', 1)[-1][:5] or 'm4a'
            source_file = tmp / f'source.{ext}'
            download_file(url, source_file)
        elif storage_path:
            url = sb_get_signed_url(storage_path, 'uploads')
            ext = storage_path.rsplit('.', 1)[-1][:5] or 'mp4'
            source_file = tmp / f'source.{ext}'
            download_file(url, source_file)
        elif source_url:
            ext = (source_url.rsplit('.', 1)[-1].split('?')[0])[:5] or 'mp4'
            source_file = tmp / f'source.{ext}'
            download_file(source_url, source_file)
        else:
            raise ValueError('No source media available')

        # Step 2: Build SRT from transcript word timings
        srt_file: Path | None = None
        if transcript:
            word_timings = transcript.get('word_timings', [])
            if isinstance(word_timings, str):
                try:
                    word_timings = json.loads(word_timings)
                except Exception:
                    word_timings = []
            if word_timings:
                srt_content = build_srt(word_timings, start_sec, end_sec)
                if srt_content.strip():
                    srt_file = tmp / 'captions.srt'
                    srt_file.write_text(srt_content, encoding='utf-8')
                    log.info(f'SRT written: {len(srt_content.splitlines())} lines')

        # Step 3: Render 240p preview
        out_path = tmp / f'preview_{clip_index}'
        rendered = render_preview(
            source_path=source_file,
            out_path=out_path,
            start_sec=start_sec,
            end_sec=end_sec,
            srt_path=srt_file,
            watermark_text=WATERMARK_TEXT,
            dry_run=dry_run,
        )

        if dry_run:
            log.info(f'[DRY RUN] Clip {clip_id} render complete')
            sb_patch('clip_outputs', f'id=eq.{clip_id}', {
                'render_status': 'preview_ready',
                'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            })
            return

        # Step 4: Upload to previews bucket
        ext = rendered.suffix.lstrip('.')
        content_type = 'audio/mp4' if ext == 'm4a' else 'video/mp4'
        storage_dest = f'{user_id}/{asset_id}/clips/clip_{clip_index}_preview.{ext}'

        t0 = time.time()
        sb_upload(str(rendered), storage_dest, 'previews', content_type)
        upload_elapsed = time.time() - t0
        size_kb = rendered.stat().st_size // 1024

        log.info(f'Uploaded {size_kb} KB in {upload_elapsed:.1f}s → previews/{storage_dest}')

        # Step 5: Generate signed URL (7-day expiry)
        preview_url = sb_get_public_url(storage_dest, 'previews')

        # Step 6: Update clip_outputs
        render_duration = time.time() - t0  # rough total
        sb_patch('clip_outputs', f'id=eq.{clip_id}', {
            'render_status': 'preview_ready',
            'preview_path': storage_dest,
            'preview_url': preview_url,
            'file_size_kb': size_kb,
            'resolution': '240p',
            'render_duration_sec': round(render_duration, 1),
            'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        })
        log.info(f'Clip {clip_id}: preview_ready → {preview_url[:60]}...')

        # Step 7: Check if all clips in this job are done
        advance_job_if_done(job_id, user_id)


def poll_loop(once: bool = False, dry_run: bool = False):
    log.info(f'Render worker starting. DRY_RUN={dry_run}. FONT={FONT_PATH}')
    while True:
        clips = fetch_pending_clips(limit=3)
        if clips:
            log.info(f'Found {len(clips)} clip(s) to render')
            for clip in clips:
                try:
                    process_clip(clip, dry_run=dry_run)
                except Exception as e:
                    log.error(f'Clip {clip.get("id")} render failed: {e}', exc_info=True)
                    try:
                        sb_patch('clip_outputs', f'id=eq.{clip["id"]}', {
                            'render_status': 'failed',
                            'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                        })
                    except Exception:
                        pass
        else:
            log.debug('No clips to render, sleeping...')

        if once:
            break
        time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    if not SERVICE_ROLE_KEY:
        log.error('SUPABASE_SERVICE_ROLE_KEY not set')
        sys.exit(1)

    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true')
    parser.add_argument('--dry-run', action='store_true', help='Skip actual ffmpeg + upload')
    args = parser.parse_args()
    poll_loop(once=args.once, dry_run=args.dry_run)
