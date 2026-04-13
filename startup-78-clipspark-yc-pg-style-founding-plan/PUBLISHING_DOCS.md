# ClipSpark Publishing Integration Docs

## Integration Status

| Platform | Status | Method | API |
|----------|--------|--------|-----|
| YouTube Shorts | ✅ Live | YouTube Data API v3 | Resumable upload + refresh token |
| LinkedIn Video | ✅ Live | LinkedIn Videos API 2024 + ugcPosts v2 fallback | Token refresh supported |
| TikTok | ⚠️ Deep-link | Buffer API (if `BUFFER_ACCESS_TOKEN` set) or download+manual | TikTok Content API pending approval |
| Instagram Reels | ⚠️ Deep-link | Meta Graph API (if env vars set) or Buffer fallback | Requires Meta App approval |

---

## YouTube Shorts — Live

**API:** YouTube Data API v3  
**Upload method:** Resumable upload (handles large files reliably)  
**Auth:** OAuth2 with offline access (refresh token stored per user)

### Setup

1. Google Cloud Console → create project → enable YouTube Data API v3
2. Create OAuth 2.0 credentials (Web application type)
3. Redirect URI: `https://clipspark-tau.vercel.app/api/connect/youtube/callback`
4. Scopes: `https://www.googleapis.com/auth/youtube.upload` + `https://www.googleapis.com/auth/youtube.readonly`
5. Submit for app verification before live launch

### Env vars
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Compliance
- Shorts must be ≤60s vertical. ClipSpark enforces at render.
- Title: max 100 chars. Tags: max 30. Description: max 5,000 chars.
- Privacy: `public` by default. Users can override.
- Tokens auto-refresh 60s before expiry.
- Tokens stored encrypted in Supabase with user-scoped RLS.

---

## LinkedIn Video — Live

**API:** LinkedIn Videos API (2024) with `ugcPosts v2` fallback  
**Upload method:** Chunked resumable upload  
**Auth:** OAuth2 with refresh token

### Implementation details

The 2024 LinkedIn Videos API uses a 4-step flow:
1. `POST /rest/videos?action=initializeUpload` → get upload instructions + video URN
2. Upload chunks via `PUT` to upload URLs in instructions
3. `POST /rest/videos?action=finalizeUpload` with ETags
4. `POST /rest/posts` to create the feed post with video

If the 2024 API returns 404 (not yet enabled for the app), falls back to legacy `ugcPosts v2` automatically.

### Token refresh

LinkedIn tokens expire in ~60 days. ClipSpark:
- Stores refresh tokens per user
- Attempts refresh if token is within 2 minutes of expiry
- Falls back to "reconnect required" if refresh fails (LinkedIn doesn't always issue refresh tokens)

### Setup

1. LinkedIn Developer Portal → create app
2. Add products: **Share on LinkedIn** + **Sign In with LinkedIn using OpenID Connect**
3. Redirect URI: `https://clipspark-tau.vercel.app/api/connect/linkedin/callback`
4. Scopes: `openid profile email w_member_social`

### Env vars
```
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

### Compliance
- Video limits: ≤5GB, ≤10min, ≥3s. ClipSpark clips are within limits.
- Caption: ≤3,000 chars. Auto-truncated.
- All posts: PUBLIC visibility (by default).
- LinkedIn TOS prohibits scraping, bot behavior, and unnatural posting frequency.

---

## TikTok — Deep-link + Buffer

**Current status:** No direct API (requires TikTok app approval). Two fallback paths.

### Path A: Buffer API (if BUFFER_ACCESS_TOKEN set)

1. Create account at buffer.com, connect TikTok
2. Get API access token from Buffer → Settings → Apps
3. Set `BUFFER_ACCESS_TOKEN` in Vercel env
4. ClipSpark calls `POST /1/updates/create.json` to schedule the post

**Cost:** Buffer paid plan required for TikTok scheduling (~$6/mo)

### Path B: Deep-link fallback (always available)

Returns:
- `download_url` — direct link to the MP4
- `tiktok_deeplink` — `tiktok://upload?source=...` (works on mobile)
- `tiktok_web` — `https://www.tiktok.com/upload`
- `caption` — pre-formatted caption with hashtags
- Step-by-step posting instructions

### Path C: TikTok Content Posting API (future)

1. Apply at developers.tiktok.com
2. Request "Content Posting API" — review takes 2–4 weeks
3. Required scope: `video.publish`
4. OAuth flow to implement: `/api/connect/tiktok/auth` + `/api/connect/tiktok/callback`

**Env vars needed:**
```
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
```

### TikTok compliance
- Video: max 10min, min 1s, max 287.6MB
- Caption: max 2,200 chars
- Max 30 hashtags
- Automated tools must disclose usage — ClipSpark labels posts in UI
- TikTok prohibits content that violates Community Guidelines even via API

---

## Instagram Reels — Meta Graph API + Buffer

**Current status:** Requires Meta App approval + business/creator account.

### Path A: Meta Graph API (if INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID set)

Flow:
1. `POST /{user-id}/media` with `media_type=REELS` + `video_url`
2. Poll `GET /{container-id}?fields=status_code` until `FINISHED` (up to 30s)
3. `POST /{user-id}/media_publish` with `creation_id`

**Requirements:**
- Facebook App with Instagram Graph API product
- Permissions: `instagram_basic`, `instagram_content_publish`
- Instagram account must be **Business** or **Creator** type
- Account must be connected to a Facebook Page

**Setup:**
1. developers.facebook.com → create app → add Instagram Graph API
2. Submit for review with `instagram_content_publish`
3. Generate long-lived user access token (60-day, needs refresh)

### Path B: Buffer fallback

Same as TikTok — Buffer handles Instagram OAuth.

### Path C: Deep-link fallback

Returns download URL + `instagram://camera` deep-link + posting steps.

**Env vars:**
```
INSTAGRAM_ACCESS_TOKEN=long-lived-access-token
INSTAGRAM_USER_ID=instagram-user-id
```

### Instagram compliance
- Reels via API: ≤1GB, ≤15min, ≥3s
- Caption: ≤2,200 chars, ≤30 hashtags
- Personal accounts: must use manual method
- Meta requires disclosure for automated publishing

---

## Security

### Token storage
- All OAuth tokens stored in Supabase `oauth_connections` table
- RLS policy: `user_id = auth.uid()` — users can only see their own tokens
- Service role key used only in API routes (not exposed client-side)
- No tokens logged or exposed in analytics events

### Token rotation
- YouTube: refresh 60s before expiry
- LinkedIn: refresh 120s before expiry, stores new refresh token if provided
- Instagram/TikTok: long-lived tokens, manual reconnect if expired

---

## Testing

### YouTube
```bash
curl -X POST https://clipspark-tau.vercel.app/api/clips/{clip-id}/publish/youtube \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json"
```
Returns: `{ ok: true, posted_url: "https://youtube.com/shorts/...", video_id: "..." }`

### LinkedIn
```bash
curl -X POST https://clipspark-tau.vercel.app/api/clips/{clip-id}/publish/linkedin \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json" \
  -d '{"caption_override": "Custom caption"}'
```

### TikTok / Instagram (deep-link)
Both return `{ ok: true, method: "deeplink", download_url: ..., steps: [...] }` without credentials set.
