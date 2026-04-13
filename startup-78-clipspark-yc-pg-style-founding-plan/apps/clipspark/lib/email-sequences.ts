/**
 * Email sequence definitions + AgentMail sender.
 * Sequences are stored in email_sequences table and dispatched by the cron job.
 */

const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY!
const FROM_EMAIL = 'hello.clipspark@agentmail.to'
const FROM_NAME = 'ClipSpark'

export interface EmailStep {
  step_index: number
  delay_hours: number      // hours after signup (or after previous step)
  subject: string
  template: (ctx: EmailContext) => string
}

export interface EmailContext {
  first_name: string
  creator_segment?: string
  email: string
}

// ── Welcome + Onboarding sequence ──────────────────────────────────────────
export const WELCOME_SEQUENCE: EmailStep[] = [
  {
    step_index: 0,
    delay_hours: 0,        // immediately on signup
    subject: '⚡ Your ClipSpark account is ready',
    template: ({ first_name, creator_segment }) => `
Hi ${first_name || 'there'},

Your ClipSpark account is live.

Here's your 10-minute first-clip checklist:

  1️⃣  Upload your episode (MP3, MP4, or paste a YouTube/podcast URL)
  2️⃣  ClipSpark picks your 5 best moments — no scrubbing the timeline
  3️⃣  Check the auto-captions and adjust any words
  4️⃣  Click Publish → YouTube Shorts, LinkedIn, or TikTok

👉 Start here: https://clipspark-tau.vercel.app/upload

${creator_segment === 'founder_podcaster'
  ? '💡 Founder tip: LinkedIn clips of founder updates get 3–8× more reach than text posts on the same topic.'
  : creator_segment === 'coach_educator'
  ? '💡 Coach tip: Instagram Reels of "frameworks" and "3-step" clips tend to be your most-shared content type.'
  : '💡 Podcast tip: Post clips within 24 hours of your episode drop to capture the algorithm boost.'}

Talk soon,
— ClipSpark team

P.S. If you have any questions, just reply to this email.
`.trim(),
  },
  {
    step_index: 1,
    delay_hours: 24,       // day 1
    subject: 'Did you make your first clip yet?',
    template: ({ first_name, creator_segment }) => `
Hi ${first_name || 'there'},

Quick check-in — have you made your first clip yet?

If not, here's the fastest path:

  → Upload any episode: https://clipspark-tau.vercel.app/upload

Most creators are surprised how fast it is. Upload → get 5 clip previews → publish. 
The whole thing takes under 10 minutes.

${creator_segment === 'founder_podcaster'
  ? `Case study: One founder used their 45-minute podcast to generate 7 LinkedIn clips in a single session. One clip hit 8,400 impressions and booked 3 intro calls.`
  : creator_segment === 'coach_educator'
  ? `Case study: A business coach turned a 90-minute webinar replay into 6 Instagram Reels. The "3 mistakes" clip got 1,200 views and 40 new email subscribers in 48 hours.`
  : `Case study: A weekly podcaster was spending 3 hours per episode making clips manually. With ClipSpark, they now do 5 clips in 8 minutes. Their YouTube Shorts channel grew from 0 to 2,100 subscribers in 3 months.`}

→ Start your first clip: https://clipspark-tau.vercel.app/upload

— ClipSpark team
`.trim(),
  },
  {
    step_index: 2,
    delay_hours: 72,       // day 3
    subject: 'The one thing that makes podcast clips go viral',
    template: ({ first_name }) => `
Hi ${first_name || 'there'},

The #1 thing that separates a clip that gets 50 views from one that gets 50,000:

**The hook.**

The first 3 seconds determine everything. Our heuristic scores clips by "hook strength" — 
how quickly you get to the interesting/surprising/useful part.

Here's what a strong hook looks like:

  ✅ "The biggest mistake I made in year one of my podcast was..."
  ✅ "Nobody talks about this, but the real reason most creators quit is..."
  ✅ "I just got off a call with [guest] and they said something that changed my mind on..."

  ❌ "So today I want to talk about..."
  ❌ "Hey guys, welcome back to another episode..."
  ❌ "Before we get into today's topic..."

ClipSpark's heuristic automatically finds these moments in your audio. But if you want 
even better results: **start your next episode with a strong hook** and it'll score even higher.

See your clips: https://clipspark-tau.vercel.app/dashboard

— ClipSpark team
`.trim(),
  },
  {
    step_index: 3,
    delay_hours: 168,      // day 7
    subject: 'How are your clips performing?',
    template: ({ first_name }) => `
Hi ${first_name || 'there'},

A week in — how are your clips doing?

If you've been posting clips, you can now track their performance directly in ClipSpark:

  → Go to Performance: https://clipspark-tau.vercel.app/performance

  • Enter your view counts and completion rates
  • ClipSpark uses this data to improve future clip scoring for you
  • Connected YouTube/LinkedIn users can auto-import analytics

A few things worth knowing this week:

  🏆 Community templates: Browse clips that are working for other creators in your niche
     → https://clipspark-tau.vercel.app/templates

  ⚡ Batch rendering: Your clips process in our off-peak batch to keep costs low.
     Full-quality exports are included in your plan — no extra charge.

  📊 Heuristic v0.2: The more performance data you share, the more personalized 
     your clip scoring becomes over time.

Any questions or feedback? Just reply to this email — I read every one.

— ClipSpark team

P.S. If ClipSpark isn't a fit, no hard feelings — you can delete your account from Settings.
`.trim(),
  },
]

// ── AgentMail sender ──────────────────────────────────────────────────────
export async function sendEmail({
  to,
  subject,
  body,
}: {
  to: string
  subject: string
  body: string
}): Promise<{ message_id: string | null; error: string | null }> {
  try {
    const res = await fetch(
      `https://api.agentmail.to/v0/inboxes/${FROM_EMAIL}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AGENTMAIL_API_KEY}`,
        },
        body: JSON.stringify({
          to: [to],
          subject,
          text: body,
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return { message_id: null, error: `AgentMail error ${res.status}: ${err.slice(0, 200)}` }
    }

    const data = await res.json()
    return { message_id: data.id || data.message_id || null, error: null }
  } catch (e) {
    return { message_id: null, error: String(e) }
  }
}

/** Schedule the welcome sequence for a new user */
export async function scheduleWelcomeSequence(
  supabase: { from: (t: string) => unknown },
  userId: string,
  signupAt: Date = new Date(),
) {
  const db = supabase as { from: (t: string) => { upsert: (rows: unknown[], opts: unknown) => Promise<unknown> } }

  const rows = WELCOME_SEQUENCE.map(step => ({
    user_id: userId,
    sequence_name: 'welcome',
    step_index: step.step_index,
    scheduled_at: new Date(signupAt.getTime() + step.delay_hours * 3600 * 1000).toISOString(),
  }))

  await db.from('email_sequences').upsert(rows, { onConflict: 'user_id,sequence_name,step_index' })
}
