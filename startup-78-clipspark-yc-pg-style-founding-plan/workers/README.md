# ClipSpark Workers

These Python scripts run outside Vercel as background processes — locally, on a VPS, or via GitHub Actions cron.
All use only stdlib + `openai-whisper` (for ASR); no other pip deps required for proxy/scoring/render.

## Complete Job Lifecycle

```
Upload / URL import
      ↓
  [queued]          created by /api/ingest
      ↓
  [ingested]        file PUT complete (/api/ingest/[id]/complete)
      ↓
  [proxying]        proxy_worker.py downloads + encodes 360p proxy
      ↓
  [transcribing]    asr_worker.py runs Whisper → word_timings stored
      ↓
  [scoring]         scoring_worker.py picks top N clip windows
      ↓             (writes clip_outputs rows)
  [rendering]       render_worker.py encodes 240p previews + burns captions
      ↓
  [preview_ready]   all clips have preview_url
      ↓
  [done]            operator marks done after QA / creator approval
```

---

## Workers

### `proxy_worker.py`
Downloads source media and creates a **360p proxy** for fast downstream processing.
- Source: yt-dlp (YouTube/SoundCloud) or direct URL or Supabase Storage upload
- Output: `libx264 crf=28` / `AAC 96k` → `previews/{user_id}/{asset_id}/proxy.mp4`
- Deps: `yt-dlp`, `ffmpeg`

### `asr_worker.py`
Transcribes proxy audio using **local Whisper** (or OpenAI API).
- Model: `whisper-small` by default (461MB, ~2x real-time on CPU)
- Output: `transcripts` table with `full_text`, `segments`, `word_timings` JSONB
- Deps: `openai-whisper`, `torch` (CPU), `ffmpeg`

### `scoring_worker.py`
Runs **heuristic v0.2** to select 3–5 clip windows from the transcript.
- 7 signals: hook_words(0.30), energy(0.20), question(0.15), story(0.12), contrast(0.10), numbers(0.08), pause(0.05)
- Generates: title, hashtags, transcript_excerpt per clip
- Output: `clip_outputs` rows with `render_status='pending'`
- Deps: stdlib only

### `render_worker.py`
Renders **240p watermarked previews** with burned-in SRT captions.
- Source: proxy from Storage (preferred) → uploads bucket → source_url
- SRT: built from `word_timings` with 6 words/caption max
- Watermark: `CLIPSPARK PREVIEW` (via ffmpeg `drawtext`)
- Output: `previews/{user_id}/{asset_id}/clips/clip_{n}_preview.mp4` (≤4 MB / 60s)
- Codec: `libx264 crf=32 -maxrate 400k` + `aac 64k mono 22050Hz`
- Deps: `ffmpeg`, `fonts-liberation`

---

## Setup

```bash
# Install system deps
apt-get install ffmpeg fonts-liberation -y

# Install Python deps (ASR worker only)
pip install openai-whisper torch --index-url https://download.pytorch.org/whl/cpu

# For YouTube support
pip install yt-dlp

# Set env
export SUPABASE_URL=https://twctmwwqxvenvieijmtn.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<your service role key>
```

## Running

```bash
# Run all 4 workers continuously (each polls every 10–15s)
python3 proxy_worker.py &
python3 asr_worker.py &
python3 scoring_worker.py &
python3 render_worker.py &

# Or one-shot (for cron / CI)
python3 proxy_worker.py --once
python3 asr_worker.py --once --model small
python3 scoring_worker.py --once
python3 render_worker.py --once

# Dry-run render (skip ffmpeg + upload)
python3 render_worker.py --once --dry-run
```

## GitHub Actions (cron, every 5 minutes)

All 4 workers have GitHub Actions workflows:
- `.github/workflows/clipspark-proxy-worker.yml`
- `.github/workflows/clipspark-asr-worker.yml`
- `.github/workflows/clipspark-scoring-worker.yml`
- `.github/workflows/clipspark-render-worker.yml`

**Activate:** Add `CLIPSPARK_SERVICE_ROLE_KEY` to repo Settings → Secrets.

## Environment Variables

| Variable | Required | Default | Used by |
|----------|----------|---------|---------|
| `SUPABASE_URL` | No | `https://twctmwwqxvenvieijmtn.supabase.co` | all |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | — | all |
| `WHISPER_MODEL` | No | `small` | asr_worker |
| `OPENAI_API_KEY` | No | — | asr_worker (API mode) |
| `SCORER_VERSION` | No | `v0.2` | scoring_worker |
| `WATERMARK_TEXT` | No | `CLIPSPARK PREVIEW` | render_worker |
| `MAX_PREVIEW_DURATION` | No | `90` | render_worker |
| `POLL_INTERVAL` | No | `10–15` | all |

## Preview render specs

| Setting | Value | Rationale |
|---------|-------|-----------|
| Resolution | 240p (scale=-2:240) | ~4× smaller than 480p |
| Video codec | libx264 crf=32 | Low quality, small file |
| Max bitrate | 400 kbps | Mobile preview cap |
| Audio | AAC 64k mono 22050Hz | Minimal bandwidth |
| Target size | ≤4 MB / 60s clip | Fast load on mobile |
| Captions | SRT burned via subtitles filter | No separate caption track needed |
| Watermark | drawtext overlay (40% opacity) | Top-center, 10pt |

## TAT estimate (P90 target ≤5 min for 60-min source)

| Stage | Time (60-min source) |
|-------|---------------------|
| Proxy encode (360p) | ~3 min CPU |
| Whisper small transcription | ~8–12 min CPU |
| Scoring | <5 sec |
| Render (3 × 45s clips at 240p) | ~30–60 sec |
| **Total** | ~12–16 min CPU |

> **For ≤5 min P90**: run on GPU (A10/T4) or use OpenAI Whisper API (eliminates the 10 min bottleneck).
> `OPENAI_API_KEY` → transcription drops to ~30s.
