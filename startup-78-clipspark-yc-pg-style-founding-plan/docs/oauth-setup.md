# ClipSpark OAuth Setup Guide

## Google / YouTube

1. Go to https://console.cloud.google.com/
2. Create a new project: "ClipSpark"
3. Enable the **YouTube Data API v3** under APIs & Services → Library
4. Go to APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Name: ClipSpark
   - Authorized redirect URIs: `https://clipspark-tau.vercel.app/api/connect/youtube/callback`
5. Copy the **Client ID** and **Client Secret**
6. Update Vercel env vars:
   ```
   GOOGLE_CLIENT_ID=<your-client-id>
   GOOGLE_CLIENT_SECRET=<your-client-secret>
   ```
7. Also set up OAuth consent screen:
   - App name: ClipSpark
   - Scopes: `youtube.upload`, `youtube.readonly`
   - Test users: add your email during development
   - Production: submit for verification when ready

## LinkedIn

1. Go to https://www.linkedin.com/developers/apps
2. Create a new app: "ClipSpark"
   - LinkedIn Page: create one for ClipSpark
3. Under Products, request access to **Share on LinkedIn** + **Sign In with LinkedIn using OpenID Connect**
4. Under Auth → OAuth 2.0 settings:
   - Authorized Redirect URLs: `https://clipspark-tau.vercel.app/api/connect/linkedin/callback`
5. Copy **Client ID** and **Client Secret**
6. Update Vercel env vars:
   ```
   LINKEDIN_CLIENT_ID=<your-client-id>
   LINKEDIN_CLIENT_SECRET=<your-client-secret>
   ```
7. Required scopes: `openid`, `profile`, `w_member_social`, `r_liteprofile`

## TikTok

TikTok does not allow server-side video uploads without going through their developer approval process
(requires business verification, app review, etc.). 

For MVP: TikTok uses a **deep-link fallback** — clicking "Open ↗" opens TikTok's web upload page
pre-filled with the hashtags. User manually uploads the downloaded video.

For post-alpha TikTok direct upload:
1. Apply for TikTok for Developers: https://developers.tiktok.com/
2. Register your app and request "Content Posting API" access
3. Implement: `POST /api/connect/tiktok/auth` and `POST /api/clips/[id]/publish/tiktok`
   using the TikTok OAuth2 flow + `/v2/post/publish/video/upload/` endpoint

## Instagram Reels

Instagram's API (Meta Graph API) requires:
- Facebook Business Manager verification
- Instagram Professional Account
- `pages_show_list`, `instagram_basic`, `instagram_content_publish` permissions

For MVP: same deep-link fallback as TikTok.

Post-alpha:
1. Create a Meta App: https://developers.facebook.com/
2. Add Instagram Basic Display + Instagram Content Publishing
3. Implement OAuth2 + Media Container + Publish endpoints

## Callback URLs Summary

| Provider | Callback URL |
|----------|-------------|
| YouTube  | `https://clipspark-tau.vercel.app/api/connect/youtube/callback` |
| LinkedIn | `https://clipspark-tau.vercel.app/api/connect/linkedin/callback` |
| TikTok   | `https://clipspark-tau.vercel.app/api/connect/tiktok/callback` (future) |

## Environment Variables (Vercel)

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```
