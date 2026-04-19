# TeachRepo — Launch Copy & Brand Guide

## Taglines

**Primary (headline):**
> Turn any GitHub repo into a paywalled course — in minutes.

**Secondary (sub-headline):**
> Write lessons in Markdown, push to git, sell with Stripe. No drag-and-drop, no lock-in.

**One-liner (directory submissions, social bio):**
> Git-native course platform for engineers. Markdown → paywalled course in minutes.

**Twitter/X bio (160 chars):**
> Ship courses like you ship code. Markdown + Git + Stripe. Free tier forever. teachrepo.com

---

## Feature Bullets (long form)

- 📁 **Markdown-native authoring** — write lessons in the same repo as your code
- 🔒 **Stripe checkout built-in** — sell individual courses or offer them free
- 🧩 **Auto-graded quizzes** — YAML frontmatter, no backend required
- 📦 **Gated code sandboxes** — StackBlitz/CodeSandbox embeds unlocked on purchase
- 🌿 **Git-versioned by default** — every push updates your course automatically
- 🔗 **Affiliate tracking** — share revenue with promoters, zero integration work
- 🆓 **Free tier: self-host** — deploy to Vercel, keep 100% of revenue
- ☁️  **Hosted SaaS** — one-click deploy, marketplace listing, zero ops

## Feature Bullets (short, for directory cards)

- Repo → course in 5 minutes
- Stripe paywall, zero config
- Auto-graded quizzes (YAML)
- Git-versioned course content
- Gated StackBlitz sandboxes
- Built-in affiliate tracking
- Free tier + hosted SaaS

---

## Product Description (Product Hunt / directory long form)

TeachRepo converts a GitHub repository or folder of Markdown notes into a
paywalled, versioned mini-course site. It's built for engineers who want to
monetise their expertise without leaving their editor.

**The problem:** Existing platforms (Gumroad, Teachable, Notion) force you into
drag-and-drop UIs, charge high revenue splits, and don't understand code.
Engineers end up hand-rolling SSGs + Stripe integrations that take weeks.

**TeachRepo's approach:** A repo template + CLI. You write lessons in Markdown
with YAML frontmatter for quizzes and metadata. `git push` → your course is live
with a Stripe checkout, gated code sandboxes, and an auto-generated sitemap.
Deploy on Vercel in one click, or self-host entirely for free.

**Who it's for:** Developers, DevRel engineers, open-source maintainers, and
technical educators who want code-first tools and fair revenue terms.

---

## Pricing Summary

| Tier | Price | Revenue share | Deploy |
|---|---|---|---|
| **Free / Self-hosted** | $0 | 100% yours | Your Vercel/server |
| **Hosted Starter** | $19/mo | 95% (5% platform fee) | Our CDN + marketplace |
| **Hosted Pro** | $49/mo | 97% | Priority CDN + analytics |

---

## Social Post Templates

### Twitter/X launch post
```
🚀 Launching TeachRepo — turn any GitHub repo into a paywalled course in minutes.

✅ Write lessons in Markdown
✅ Stripe checkout, zero config  
✅ Auto-graded quizzes (YAML)
✅ Free tier: keep 100% revenue

Built for engineers who live in their editor.

👉 teachrepo.com
```

### LinkedIn post
```
I built TeachRepo to solve my own frustration: I wanted to sell a technical
course without fighting drag-and-drop UIs or paying 30% platform fees.

The result: a git-native course platform. You write Markdown, push to GitHub,
and get a Stripe-powered course site automatically deployed on Vercel.

Key features:
• Markdown-native lesson authoring
• Stripe checkout built in
• Auto-graded quizzes via YAML frontmatter
• Gated code sandbox embeds (StackBlitz/CodeSandbox)
• Free tier — self-host and keep 100% of revenue

Try it free → teachrepo.com
```

### Hacker News Show HN
```
Show HN: TeachRepo – turn a GitHub repo into a paywalled course in minutes

https://teachrepo.com

I kept seeing developer educators hand-roll Stripe + SSG setups to sell courses.
TeachRepo is a template + CLI that does this automatically: write lessons in
Markdown, add YAML frontmatter for quizzes and pricing, push to GitHub, and get
a deployed course with Stripe checkout.

Free tier: deploy to your own Vercel/server, keep 100% revenue.
Hosted tier: marketplace listing + CDN + analytics.

Tech: Next.js 15, Supabase, Stripe, MDX, Playwright for the full test suite.
The whole app is open-core — the template is MIT.
```

---

## Color Palette

| Name | Hex | Usage |
|---|---|---|
| Violet Primary | `#7C3AED` | CTAs, logo, links |
| Violet Dark | `#6D28D9` | Hover states |
| Violet Light | `#A78BFA` | Accents |
| Gray 900 | `#111827` | Body text |
| Gray 500 | `#6B7280` | Secondary text |
| Gray 50 | `#F9FAFB` | Backgrounds |
| Green 500 | `#10B981` | Free/success badges |

## Typography

- **Display / Headings:** System-UI stack (Inter where available)
- **Body:** 16px/1.6 — same system stack
- **Code / CLI:** `font-mono` — JetBrains Mono, Menlo, monospace

---

## Asset File Index

| File | Dimensions | Usage |
|---|---|---|
| `logo.svg` | Scalable | All UI |
| `logo-192.png` | 192×192 | PWA manifest, app icons |
| `logo-512.png` | 512×512 | Social profiles, large displays |
| `favicon.ico` | 16/32/48 multi | Browser tab |
| `og-cover.png` | 1200×630 | Open Graph / Facebook |
| `twitter-card.png` | 1200×600 | Twitter summary_large_image |
| `screenshot-homepage.png` | 1280×800 | Press kit, README |
| `screenshot-marketplace.png` | 1280×800 | Press kit, Product Hunt |
| `screenshot-course.png` | 1280×800 | Press kit |
| `screenshot-lesson.png` | 1280×800 | Press kit |
| `screenshot-docs.png` | 1280×800 | Press kit |
| `demo-flow.gif` | 960×600 | Product Hunt gallery, README |
