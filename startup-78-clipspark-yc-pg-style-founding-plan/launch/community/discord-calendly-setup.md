# Discord + Calendly Setup Guide — ClipSpark

## Why these matter
- **Discord**: async support community, feature voting, social proof ("X members building in public")
- **Calendly**: founder-led onboarding calls — highest-converting activation lever for early users

---

## Step 1: Discord Server Setup

### 1a. Create the server
1. Go to discord.com/app → "Add a server" → "Create My Own" → "For a club or community"
2. Name: **ClipSpark Community**
3. Upload icon (use the ClipSpark logo from `/public/logo.png`)

### 1b. Channel structure (create these channels)
```
📣 ANNOUNCEMENTS
  #announcements      (read-only, founder posts here)
  #changelog          (read-only, product updates)

💬 COMMUNITY
  #introductions      (new members say hi)
  #general            (open chat)
  #share-your-clips   (post clips made with ClipSpark)

🛠️ SUPPORT
  #help               (public support channel)
  #bug-reports        (structured bug reports)
  #feature-requests   (vote with reactions)

🎙️ CREATORS
  #podcasting         (podcast-specific tips)
  #youtube-shorts     (Shorts strategy)
  #linkedin           (LinkedIn content)
```

### 1c. Roles to create
- **Founder** — you (admin)
- **Pro Member** — for Pro plan users (manual or via webhook)
- **Alpha Tester** — for alpha users
- **Member** — everyone else (default)

### 1d. Set up invite link
1. Server Settings → Invites → Create invite
2. Set to "never expire"
3. URL will be: `discord.gg/XXXXXXX`
4. **Update the `DISCORD_INVITE` constant** in:
   `apps/clipspark/app/community/page.tsx` line 13
5. Also update the footer link in `apps/clipspark/app/page.tsx`

### 1e. Post a welcome message in #general
```
👋 Welcome to the ClipSpark community!

We're a community of podcasters, streamers, and creators who want to
repurpose their content without spending 5 hours per episode.

🔗 App: https://clipspark-tau.vercel.app
💬 Founder DMs are open — ask me anything

If you're just getting started:
1. Upload an episode at /upload
2. Post your first clips in #share-your-clips
3. Hit me up in #help if anything breaks

Use invite code BETAOPEN in Settings → Invite Code for 2 months Pro free.
```

### 1f. Pin in #feature-requests
```
💡 Feature Request Guidelines

React with 👍 to vote for existing requests before posting a duplicate.

Format for new requests:
**Feature:** [short name]
**Why I need it:** [1-2 sentences]
**Workaround I use now:** [current workaround]

Top voted features get prioritized. I review this channel every Friday.
```

---

## Step 2: Calendly Setup

### 2a. Create account
1. Go to calendly.com → Sign up with **hello.clipspark@agentmail.to**
2. Set your name to "ClipSpark Founder"
3. Connect your Google Calendar or Outlook to avoid double-booking

### 2b. Create the event type
1. New Event Type → One-on-One
2. **Name:** ClipSpark Onboarding Call
3. **Duration:** 15 minutes
4. **URL slug:** `onboarding` (makes URL: calendly.com/clipspark/onboarding)
5. **Location:** Zoom or Google Meet (add your link)

### 2c. Event description
```
Free 15-minute call with the ClipSpark founder.

We'll:
- Upload one of your podcast episodes together
- Walk through the clip editor and approval flow
- Get your first clips ready to post before we hang up
- Set up YouTube Shorts or LinkedIn publishing if you want

No pitch. Just making sure ClipSpark actually works for you.

Bring: any podcast or video file (MP3, MP4, WAV)
```

### 2d. Availability
- Set Mon–Fri, 9am–6pm PT
- Block any existing calendar commitments

### 2e. Confirmation email (customize)
Subject: Your ClipSpark onboarding call is booked ✅

```
Hi [Name],

Looking forward to our call on [Date] at [Time].

To make the most of our 15 minutes, please have ready:
- A podcast or video file you want to turn into clips
- Your ClipSpark account (create one free at https://clipspark-tau.vercel.app)

You can also start an upload before our call — that way the processing will
already be done when we join.

See you soon,
— ClipSpark Founder
hello.clipspark@agentmail.to
```

### 2f. Update the app
Once your Calendly URL is live, remove the founder setup notice from:
`apps/clipspark/app/call/page.tsx`

Replace this constant:
```typescript
const CALENDLY_URL = 'https://calendly.com/clipspark/onboarding'
```

And optionally add the Calendly inline widget by adding to `app/layout.tsx`:
```html
<Script src="https://assets.calendly.com/assets/external/widget.js" />
```

Then replace the `<CalendlyEmbed>` component with:
```tsx
<div 
  className="calendly-inline-widget w-full" 
  data-url="https://calendly.com/clipspark/onboarding?embed_type=Inline"
  style={{ minWidth: '320px', height: '700px' }}
/>
```

---

## Step 3: Promote both channels

### Add to landing page (already done)
- Discord link in footer + community page
- Calendly link in /call page

### Add to onboarding email (Email 1)
```
P.S. Two ways to get help fast:
1. Discord: discord.gg/clipspark (community + direct founder access)
2. Free 15-min call: clipspark-tau.vercel.app/call (I'll help with your first upload)
```

### Add to in-app dashboard (already done)
Support footer bar: Help & FAQ | Free onboarding call | Discord | Email support

---

## Step 4: Daily moderation workflow (30 min/day)

Morning:
- Check #help and #bug-reports — reply to all posts < 24h old
- Check hello.clipspark@agentmail.to — reply to support emails
- React to clips in #share-your-clips

Weekly (Friday):
- Review #feature-requests — note top voted items
- Post a changelog update in #changelog
- Update outreach-tracker.md with Discord member count

---

## Links to update in code once set up

| File | Line | What to update |
|------|------|----------------|
| `app/community/page.tsx` | line 13 | `DISCORD_INVITE` constant |
| `app/call/page.tsx` | line 13 | `CALENDLY_URL` constant |
| `app/page.tsx` | footer Discord link | `https://discord.gg/clipspark` |
| `app/dashboard/page.tsx` | support footer | Discord link |
| `launch/social/social-proof-assets.md` | Email 1 PS | Discord + Calendly links |
