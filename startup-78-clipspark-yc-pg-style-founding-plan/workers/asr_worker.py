#!/usr/bin/env python3
"""
ClipSpark ASR Worker
====================
Polls Supabase for processing_jobs with status='transcribing',
downloads the proxy audio (from previews bucket or uploads bucket),
runs Whisper transcription with word-level timestamps,
stores results in the transcripts table,
and advances job status to 'scoring'.

Usage:
    python3 asr_worker.py [--once] [--model tiny|small|medium]

Environment variables:
    SUPABASE_URL                (default: https://twctmwwqxvenvieijmtn.supabase.co)
    SUPABASE_SERVICE_ROLE_KEY   (required)
    WHISPER_MODEL               (default: small)
    POLL_INTERVAL               (default: 15 seconds)
    OPENAI_API_KEY              (optional: use OpenAI API instead of local Whisper)
"""

import os
import sys
import json
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
    format='%(asctime)s [asr_worker] %(levelname)s %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
log = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://twctmwwqxvenvieijmtn.supabase.co')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
WHISPER_MODEL = os.environ.get('WHISPER_MODEL', 'small')
POLL_INTERVAL = int(os.environ.get('POLL_INTERVAL', '15'))

# OpenAI Whisper API pricing: $0.006/min as of 2024
WHISPER_API_COST_PER_MIN = 0.006


def sb_headers():
    return {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
    }


def sb_get_json(path: str) -> list | dict:
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{path}',
        headers={**sb_headers(), 'Accept': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def sb_patch(table: str, filters: str, payload: dict):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}?{filters}',
        data=data,
        method='PATCH',
        headers=sb_headers(),
    )
    try:
        with urllib.request.urlopen(req, timeout=15):
            pass
    except Exception as e:
        log.error(f'sb_patch {table}: {e}')


def sb_insert(table: str, payload: dict) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}',
        data=data,
        method='POST',
        headers={**sb_headers(), 'Prefer': 'return=representation'},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        rows = json.loads(r.read())
        return rows[0] if isinstance(rows, list) else rows


def sb_upsert(table: str, payload: dict, on_conflict: str = 'id') -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{table}?on_conflict={on_conflict}',
        data=data,
        method='POST',
        headers={**sb_headers(), 'Prefer': f'return=representation,resolution=merge-duplicates'},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        rows = json.loads(r.read())
        return rows[0] if isinstance(rows, list) else rows


def fetch_transcribing_jobs(limit=2) -> list:
    params = urllib.parse.urlencode({
        'status': 'eq.transcribing',
        'limit': str(limit),
        'order': 'created_at.asc',
    })
    try:
        return sb_get_json(f'processing_jobs?{params}')
    except Exception as e:
        log.warning(f'fetch jobs error: {e}')
        return []


def fetch_asset(asset_id: str) -> dict | None:
    params = urllib.parse.urlencode({'id': f'eq.{asset_id}'})
    try:
        rows = sb_get_json(f'media_assets?{params}')
        return rows[0] if rows else None
    except Exception as e:
        log.warning(f'fetch_asset: {e}')
        return None


def get_signed_download_url(path: str, bucket: str) -> str:
    """Create a signed download URL via Supabase Storage API."""
    payload = json.dumps({'expiresIn': 3600}).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}',
        data=payload,
        method='POST',
        headers=sb_headers(),
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        d = json.loads(r.read())
        signed = d.get('signedURL') or d.get('signedUrl', '')
        if signed.startswith('/'):
            return f'{SUPABASE_URL}/storage/v1{signed}'
        return signed


def download_audio(url: str, dest: Path):
    log.info(f'Downloading audio: {url[:80]}...')
    urllib.request.urlretrieve(url, dest)
    size_mb = dest.stat().st_size / 1_048_576
    log.info(f'Downloaded {size_mb:.1f} MB')


def extract_audio_for_whisper(source: Path, dest: Path):
    """Convert any audio/video to 16kHz mono WAV — Whisper's optimal format."""
    cmd = [
        'ffmpeg', '-y', '-i', str(source),
        '-ar', '16000',    # 16kHz sample rate
        '-ac', '1',        # mono
        '-c:a', 'pcm_s16le',
        str(dest),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        raise RuntimeError(f'ffmpeg audio extract failed: {result.stderr[-500:]}')
    size_mb = dest.stat().st_size / 1_048_576
    log.info(f'16kHz WAV: {size_mb:.1f} MB → {dest.name}')


def transcribe_local(audio_path: Path, model_name: str = 'small') -> dict:
    """Run Whisper locally with word-level timestamps."""
    import whisper

    log.info(f'Loading Whisper model: {model_name}')
    model = whisper.load_model(model_name)

    log.info(f'Transcribing {audio_path.name}...')
    t0 = time.time()
    result = model.transcribe(
        str(audio_path),
        word_timestamps=True,
        language=None,          # auto-detect
        verbose=False,
        fp16=False,             # CPU-safe
        beam_size=5,
        best_of=5,
        temperature=0,
        condition_on_previous_text=True,
        compression_ratio_threshold=2.4,
        no_speech_threshold=0.6,
    )
    elapsed = time.time() - t0
    log.info(f'Transcription complete in {elapsed:.1f}s (model={model_name})')
    return result


def transcribe_openai_api(audio_path: Path, model: str = 'whisper-1') -> dict:
    """Use OpenAI Whisper API (paid). Returns Whisper-format result dict."""
    import openai

    log.info(f'Calling OpenAI Whisper API...')
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    with open(audio_path, 'rb') as f:
        # verbose_json gives us word-level timestamps
        response = client.audio.transcriptions.create(
            model=model,
            file=f,
            response_format='verbose_json',
            timestamp_granularities=['word', 'segment'],
        )

    # Convert to local Whisper format
    segments = []
    for i, seg in enumerate(response.segments or []):
        words = []
        for w in (seg.words or []):
            words.append({
                'word': w.word,
                'start': w.start,
                'end': w.end,
                'probability': getattr(w, 'probability', 1.0),
            })
        segments.append({
            'id': i,
            'start': seg.start,
            'end': seg.end,
            'text': seg.text,
            'words': words,
        })

    return {
        'text': response.text,
        'language': response.language,
        'segments': segments,
        'duration': getattr(response, 'duration', None),
    }


def build_word_timings(segments: list) -> list:
    """Flatten segment word arrays into a flat word_timings array."""
    timings = []
    for seg in segments:
        seg_id = seg.get('id', 0)
        for w in seg.get('words', []):
            timings.append({
                'word': w.get('word', '').strip(),
                'start': round(w.get('start', 0), 3),
                'end': round(w.get('end', 0), 3),
                'probability': round(w.get('probability', 1.0), 4),
                'segment_id': seg_id,
            })
    return timings


def normalise_segments(raw_segments: list) -> list:
    """Normalise local Whisper segment format (may have words as objects)."""
    out = []
    for i, seg in enumerate(raw_segments):
        words = []
        raw_words = seg.get('words', [])
        for w in raw_words:
            if hasattr(w, '__dict__'):
                w = vars(w)
            words.append({
                'word': str(w.get('word', '')).strip(),
                'start': float(w.get('start', 0)),
                'end': float(w.get('end', 0)),
                'probability': float(w.get('probability', 1.0)),
            })
        out.append({
            'id': i,
            'start': float(seg.get('start', 0)),
            'end': float(seg.get('end', 0)),
            'text': str(seg.get('text', '')).strip(),
            'words': words,
        })
    return out


def estimate_cost(duration_sec: float | None, model: str) -> float:
    """Estimate transcription cost in USD."""
    if not duration_sec:
        return 0.0
    if model == 'openai-api':
        return (duration_sec / 60) * WHISPER_API_COST_PER_MIN
    # Local: electricity + infra cost, ~$0.0002/min on cheap VPS
    return (duration_sec / 60) * 0.0002


def update_job_status(job_id: str, status: str, extra: dict | None = None):
    payload = {
        'status': status,
        'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    }
    if extra:
        payload.update(extra)
    sb_patch('processing_jobs', f'id=eq.{job_id}', payload)


def process_job(job: dict):
    job_id = job['id']
    asset_id = job['media_asset_id']
    user_id = job['user_id']
    log.info(f'ASR: job={job_id} asset={asset_id}')

    update_job_status(job_id, 'transcribing')  # refresh updated_at

    asset = fetch_asset(asset_id)
    if not asset:
        log.error(f'Asset {asset_id} not found')
        update_job_status(job_id, 'failed', {'error_msg': 'Asset not found'})
        return

    # Prefer proxy (smaller file) over original upload
    proxy_path = asset.get('proxy_path')
    storage_path = asset.get('storage_path')
    source_url = asset.get('source_url')

    with tempfile.TemporaryDirectory(prefix='clipspark_asr_') as tmpdir:
        tmp = Path(tmpdir)

        try:
            # Step 1: Acquire audio file
            audio_source: Path | None = None

            if proxy_path:
                signed_url = get_signed_download_url(proxy_path, 'previews')
                ext = proxy_path.split('.')[-1][:5] or 'm4a'
                audio_source = tmp / f'proxy.{ext}'
                download_audio(signed_url, audio_source)
            elif storage_path:
                signed_url = get_signed_download_url(storage_path, 'uploads')
                ext = storage_path.split('.')[-1][:5] or 'mp4'
                audio_source = tmp / f'upload.{ext}'
                download_audio(signed_url, audio_source)
            elif source_url:
                # Direct URL import that wasn't downloaded by proxy worker
                ext = source_url.split('.')[-1].split('?')[0][:5] or 'mp4'
                audio_source = tmp / f'source.{ext}'
                download_audio(source_url, audio_source)
            else:
                raise ValueError('No audio source available (no proxy, upload, or source_url)')

            # Step 2: Convert to 16kHz mono WAV
            wav_path = tmp / 'audio_16k.wav'
            extract_audio_for_whisper(audio_source, wav_path)

            # Step 3: Transcribe
            if OPENAI_API_KEY and not os.environ.get('FORCE_LOCAL_WHISPER'):
                raw = transcribe_openai_api(wav_path)
                model_used = 'whisper-1 (openai-api)'
                cost_model = 'openai-api'
            else:
                model_name = WHISPER_MODEL
                raw = transcribe_local(wav_path, model_name)
                model_used = f'whisper-{model_name} (local)'
                cost_model = model_name

            # Step 4: Normalise and flatten
            full_text = raw.get('text', '').strip()
            language = raw.get('language', 'en')
            duration = raw.get('duration') or asset.get('duration_sec') or 0
            raw_segments = raw.get('segments', [])
            segments = normalise_segments(raw_segments)
            word_timings = build_word_timings(segments)
            word_count = len(word_timings)
            cost = estimate_cost(float(duration) if duration else None, cost_model)

            log.info(f'Transcript: {word_count} words, language={language}, cost=${cost:.4f}')

            # Step 5: Store transcript
            transcript_record = {
                'media_asset_id': asset_id,
                'user_id': user_id,
                'full_text': full_text,
                'language': language,
                'model_name': model_used,
                'duration_sec': float(duration) if duration else None,
                'asr_cost_usd': round(cost, 6),
                'word_count': word_count,
                'segments': json.dumps(segments),
                'word_timings': json.dumps(word_timings),
            }
            transcript = sb_insert('transcripts', transcript_record)
            transcript_id = transcript['id']
            log.info(f'Transcript stored: {transcript_id}')

            # Step 6: Update media_asset with transcript_id + language
            sb_patch('media_assets', f'id=eq.{asset_id}', {
                'transcript_id': transcript_id,
                'transcript_status': 'completed',
                'language': language,
                'duration_sec': float(duration) if duration else None,
                'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            })

            # Step 7: Advance job → scoring
            update_job_status(job_id, 'scoring', {
                'transcript_ready_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            })
            log.info(f'Job {job_id}: transcript done → scoring')

        except Exception as e:
            log.error(f'Job {job_id} ASR failed: {e}', exc_info=True)
            update_job_status(job_id, 'failed', {'error_msg': str(e)[:500]})
            sb_patch('media_assets', f'id=eq.{asset_id}', {
                'transcript_status': 'failed',
                'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            })


def poll_loop(once: bool = False):
    log.info(f'ASR worker starting. Model: {WHISPER_MODEL}. API: {"openai" if OPENAI_API_KEY else "local"}')
    while True:
        jobs = fetch_transcribing_jobs(limit=2)
        if jobs:
            log.info(f'Found {len(jobs)} transcribing job(s)')
            for job in jobs:
                process_job(job)
        else:
            log.debug('No jobs waiting, sleeping...')

        if once:
            break
        time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    if not SERVICE_ROLE_KEY:
        log.error('SUPABASE_SERVICE_ROLE_KEY not set')
        sys.exit(1)

    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true', help='Process one batch and exit')
    parser.add_argument('--model', default=WHISPER_MODEL, choices=['tiny', 'small', 'medium', 'large'],
                        help='Whisper model to use (default: small)')
    args = parser.parse_args()

    WHISPER_MODEL = args.model
    poll_loop(once=args.once)
