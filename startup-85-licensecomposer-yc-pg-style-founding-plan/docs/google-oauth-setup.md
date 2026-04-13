# Google OAuth + Auth Setup — PactPack (LicenseComposer)

## Current Status ✅

| Provider | Status |
|----------|--------|
| Email / Password | ✅ Enabled |
| Google OAuth | ✅ Enabled (credentials required — see Step 1) |
| Site URL | `https://pactpack.com` |
| Auth callback | `https://pactpack.com/auth/callback` |
| Supabase project | `yxkeyftjkblrikxserbs.supabase.co` |

---

## What's Already Built

- `/login` — email + password form + "Continue with Google" button
- `/signup` — registration form + Google OAuth
- `/auth/callback` — exchanges OAuth code for session, upserts profile row
- `middleware.ts` — protects `/dashboard`, `/wizard`, `/licenses`; redirects authed users away from `/login`
- `handle_new_user` trigger — auto-creates `profiles` + `users` rows on every signup
- RLS policies — user data isolated by `auth.uid()`

---

## Step 1: Activate Google OAuth (requires Google Cloud Console)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**
2. Create OAuth 2.0 Client ID (Web Application)
3. Add these **Authorized Redirect URIs**:
   ```
   https://yxkeyftjkblrikxserbs.supabase.co/auth/v1/callback
   https://pactpack.com/auth/callback
   http://localhost:3000/auth/callback
   ```
4. Copy **Client ID** and **Client Secret**

## Step 2: Set credentials in Supabase

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/yxkeyftjkblrikxserbs/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_google_enabled": true,
    "external_google_client_id": "YOUR_GOOGLE_CLIENT_ID",
    "external_google_secret": "YOUR_GOOGLE_CLIENT_SECRET"
  }'
```

---

## Allowed Redirect URLs (already configured)

```
https://pactpack.com/**
https://*.vercel.app/**
http://localhost:3000/**
```

---

## Auth Flow

```
User clicks "Continue with Google"
  → Supabase redirects to Google consent screen
  → Google redirects to: https://yxkeyftjkblrikxserbs.supabase.co/auth/v1/callback
  → Supabase exchanges code, creates session
  → Redirects to: https://pactpack.com/auth/callback?code=...
  → /auth/callback route exchanges code → session → upserts profile → redirects /dashboard
```

---

## Email / Password Auth

Already fully functional. Users can sign up at `/signup` and sign in at `/login`.

Email confirmation is **off** (mailer_autoconfirm: false) — users must confirm their email before signing in.
To enable instant access during development:

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/yxkeyftjkblrikxserbs/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mailer_autoconfirm": true}'
```
