#!/usr/bin/env python3
"""
ClipSpark Proxy Worker
======================
Polls Supabase for processing_jobs with status='ingested',
downloads the source media, produces a 360p/96kbps proxy,
uploads it to the 'previews' bucket, and advances job status to 'transcribing'.

For URL imports (YouTube/direct): yt-dlp downloads the source first.
For file uploads: downloads from Supabase Storage.

Usage:
    python3 proxy_worker.py [--once]

Environment variables required:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY

Install deps:
    pip install supabase yt-dlp
    apt-get install ffmpeg   (or brew install ffmpeg)
"""

import os
import sys
import time
import json
import shutil
import subprocess
import tempfile
import logging
import argparse
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [proxy_worker] %(levelname)s %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
log = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://twctmwwqxvenvieijmtn.supabase.co')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
POLL_INTERVAL_SEC = int(os.environ.get('PROXY_POLL_INTERVAL', '15'))
MAX_RETRIES = 3

# 360p proxy settings: low-bandwidth for fast preview
PROXY_VIDEO_ARGS = [
    '-vf', 'scale=-2:360',
    '-c:v', 'libx264', '-crf', '28', '-preset', 'fast', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '96k', '-ac', '2',
    '-threads', '2',
]

# Audio-only proxy (for podcasts / audio-only sources)
PROXY_AUDIO_ARGS = [
    '-c:a', 'aac', '-b:a', '96k', '-ac', '2',
    '-vn',
]


def supabase_headers():
    return {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
    }


def sb_get(path: str) -> dict:
    import urllib.request
    url = f'{SUPABASE_URL}{path}'
    req = urllib.request.Request(url, headers=supabase_headers())
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def sb_patch(path: str, payload: dict) -> dict:
    import urllib.request
    url = f'{SUPABASE_URL}{path}'
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method='PATCH', headers={
        **supabase_headers(),
        'Prefer': 'return=representation',
    })
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def fetch_queued_jobs(limit=3) -> list:
    """Fetch jobs with status='ingested', ordered by created_at."""
    import urllib.request, urllib.parse
    params = urllib.parse.urlencode({
        'status': 'eq.ingested',
        'limit': str(limit),
        'order': 'created_at.asc',
    })
    url = f'{SUPABASE_URL}/rest/v1/processing_jobs?{params}'
    req = urllib.request.Request(url, headers={
        **supabase_headers(),
        'Accept': 'application/json',
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except Exception as e:
        log.warning(f'fetch_queued_jobs error: {e}')
        return []


def fetch_asset(asset_id: str) -> dict | None:
    import urllib.request, urllib.parse
    params = urllib.parse.urlencode({'id': f'eq.{asset_id}'})
    url = f'{SUPABASE_URL}/rest/v1/media_assets?{params}'
    req = urllib.request.Request(url, headers={**supabase_headers(), 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            rows = json.loads(r.read())
            return rows[0] if rows else None
    except Exception as e:
        log.warning(f'fetch_asset error: {e}')
        return None


def update_job_status(job_id: str, status: str, extra: dict = None):
    import urllib.request
    payload = {'status': status, 'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
    if extra:
        payload.update(extra)
    url = f'{SUPABASE_URL}/rest/v1/processing_jobs?id=eq.{job_id}'
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method='PATCH', headers=supabase_headers())
    try:
        with urllib.request.urlopen(req, timeout=15):
            pass
    except Exception as e:
        log.error(f'update_job_status error: {e}')


def update_asset(asset_id: str, payload: dict):
    import urllib.request
    url = f'{SUPABASE_URL}/rest/v1/media_assets?id=eq.{asset_id}'
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method='PATCH', headers=supabase_headers())
    try:
        with urllib.request.urlopen(req, timeout=15):
            pass
    except Exception as e:
        log.error(f'update_asset error: {e}')


def get_storage_download_url(path: str, bucket: str = 'uploads') -> str:
    """Get a signed download URL for a storage object."""
    import urllib.request
    url = f'{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}'
    payload = json.dumps({'expiresIn': 3600}).encode()
    req = urllib.request.Request(url, data=payload, method='POST', headers=supabase_headers())
    with urllib.request.urlopen(req, timeout=15) as r:
        d = json.loads(r.read())
        return f"{SUPABASE_URL}/storage/v1{d['signedURL']}"


def upload_proxy(local_path: str, storage_path: str, bucket: str = 'previews', content_type: str = 'video/mp4') -> str:
    """Upload proxy file to Supabase Storage, return public/signed URL."""
    import urllib.request
    url = f'{SUPABASE_URL}/storage/v1/object/{bucket}/{storage_path}'
    with open(local_path, 'rb') as f:
        data = f.read()
    req = urllib.request.Request(url, data=data, method='POST', headers={
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': content_type,
        'x-upsert': 'true',
    })
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.loads(r.read())
        log.info(f'Uploaded proxy to {bucket}/{storage_path}: {d}')
    return storage_path


def download_file(url: str, dest: Path):
    """Download a URL to a local path with progress logging."""
    import urllib.request
    log.info(f'Downloading {url[:80]}...')
    urllib.request.urlretrieve(url, dest)
    size_mb = dest.stat().st_size / 1_048_576
    log.info(f'Downloaded {size_mb:.1f} MB → {dest}')


def yt_dlp_download(source_url: str, dest_dir: Path) -> Path:
    """Download via yt-dlp, return path to downloaded file."""
    out_template = str(dest_dir / 'source.%(ext)s')
    cmd = [
        'yt-dlp',
        '--no-playlist',
        '--format', 'bestaudio[ext=m4a]/bestaudio/best[height<=720]',
        '--output', out_template,
        '--no-progress',
        source_url,
    ]
    log.info(f'yt-dlp: {source_url}')
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        raise RuntimeError(f'yt-dlp failed: {result.stderr[-500:]}')

    # Find downloaded file
    files = list(dest_dir.glob('source.*'))
    if not files:
        raise RuntimeError('yt-dlp produced no output file')
    return files[0]


def get_duration(path: Path) -> float | None:
    """Get duration via ffprobe."""
    cmd = [
        'ffprobe', '-v', 'quiet', '-print_format', 'json',
        '-show_format', str(path)
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        d = json.loads(result.stdout)
        return float(d.get('format', {}).get('duration', 0)) or None
    except Exception:
        return None


def is_audio_only(path: Path) -> bool:
    """True if source has no video stream."""
    cmd = [
        'ffprobe', '-v', 'quiet', '-print_format', 'json',
        '-show_streams', str(path)
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        d = json.loads(result.stdout)
        streams = d.get('streams', [])
        return not any(s.get('codec_type') == 'video' for s in streams)
    except Exception:
        return False


def make_proxy(source_path: Path, proxy_path: Path):
    """Encode 360p proxy (or audio-only proxy) via ffmpeg."""
    audio_only = is_audio_only(source_path)
    ext = '.m4a' if audio_only else '.mp4'
    final_proxy = proxy_path.with_suffix(ext)

    extra_args = PROXY_AUDIO_ARGS if audio_only else PROXY_VIDEO_ARGS
    cmd = [
        'ffmpeg', '-y', '-i', str(source_path),
        *extra_args,
        str(final_proxy)
    ]
    log.info(f'ffmpeg proxy encode (audio_only={audio_only})...')
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
    if result.returncode != 0:
        raise RuntimeError(f'ffmpeg failed: {result.stderr[-1000:]}')
    size_mb = final_proxy.stat().st_size / 1_048_576
    log.info(f'Proxy created: {size_mb:.1f} MB → {final_proxy}')
    return final_proxy, audio_only


def process_job(job: dict):
    job_id = job['id']
    asset_id = job['media_asset_id']
    log.info(f'Processing job {job_id} asset {asset_id}')

    # Mark as processing
    update_job_status(job_id, 'proxying')

    asset = fetch_asset(asset_id)
    if not asset:
        log.error(f'Asset {asset_id} not found')
        update_job_status(job_id, 'failed', {'error_msg': 'Asset not found'})
        return

    source_type = asset.get('source_type')
    source_url = asset.get('source_url')
    storage_path = asset.get('storage_path')
    user_id = asset.get('user_id')

    with tempfile.TemporaryDirectory(prefix='clipspark_') as tmpdir:
        tmp = Path(tmpdir)
        source_file: Path | None = None

        try:
            if source_type == 'url_import':
                if not source_url:
                    raise ValueError('source_url missing on url_import asset')
                # Try yt-dlp first (handles YouTube, SoundCloud, etc.)
                if any(x in source_url for x in ['youtube.com', 'youtu.be', 'soundcloud.com', 'spotify.com']):
                    source_file = yt_dlp_download(source_url, tmp)
                else:
                    # Direct URL download
                    ext = source_url.split('.')[-1].split('?')[0][:5] or 'mp4'
                    source_file = tmp / f'source.{ext}'
                    download_file(source_url, source_file)

            elif source_type == 'upload':
                if not storage_path:
                    raise ValueError('storage_path missing on upload asset')
                signed_url = get_storage_download_url(storage_path, bucket='uploads')
                ext = storage_path.split('.')[-1][:5] or 'mp4'
                source_file = tmp / f'source.{ext}'
                download_file(signed_url, source_file)

            else:
                raise ValueError(f'Unknown source_type: {source_type}')

            # Get duration if not already stored
            duration = asset.get('duration_sec') or get_duration(source_file)
            if duration and not asset.get('duration_sec'):
                update_asset(asset_id, {'duration_sec': duration})

            # Make 360p proxy
            proxy_out, audio_only = make_proxy(source_file, tmp / 'proxy')

            # Upload proxy to previews bucket
            proxy_ext = proxy_out.suffix.lstrip('.')
            proxy_storage_path = f'{user_id}/{asset_id}/proxy.{proxy_ext}'
            upload_proxy(str(proxy_out), proxy_storage_path,
                         content_type='audio/mp4' if audio_only else 'video/mp4')

            # Store proxy path on asset
            update_asset(asset_id, {
                'proxy_path': proxy_storage_path,
                'duration_sec': duration,
            })

            # Advance job → transcribing
            update_job_status(job_id, 'transcribing', {
                'proxy_ready_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            })
            log.info(f'Job {job_id}: proxy done → transcribing')

        except Exception as e:
            log.error(f'Job {job_id} failed: {e}')
            update_job_status(job_id, 'failed', {'error_msg': str(e)[:500]})


def poll_loop(once: bool = False):
    log.info('Proxy worker starting. Polling for ingested jobs...')
    while True:
        jobs = fetch_queued_jobs(limit=3)
        if jobs:
            log.info(f'Found {len(jobs)} job(s) to proxy')
            for job in jobs:
                process_job(job)
        else:
            log.debug('No ingested jobs, sleeping...')

        if once:
            break
        time.sleep(POLL_INTERVAL_SEC)


if __name__ == '__main__':
    if not SERVICE_ROLE_KEY:
        log.error('SUPABASE_SERVICE_ROLE_KEY not set')
        sys.exit(1)

    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true', help='Process one batch and exit')
    args = parser.parse_args()

    poll_loop(once=args.once)
