/**
 * Email notifications via Resend
 * Transactional emails for key platform events
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM = 'BetaWindow <notifications@betawindow.com>'

async function send(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set, skipping email to', to)
    return
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[email] Resend error:', err)
    }
  } catch (e) {
    console.error('[email] Failed to send email:', e)
  }
}

export const emailNotifications = {
  async jobPublished(requesterEmail: string, jobTitle: string, jobId: string) {
    await send(
      requesterEmail,
      `Your job "${jobTitle}" is live on BetaWindow`,
      `<p>Your test job <strong>${jobTitle}</strong> has been published to the marketplace.</p>
       <p>Testers can now claim it. You'll receive an email when it's assigned.</p>
       <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/jobs/${jobId}">View Job</a></p>`
    )
  },

  async jobAssigned(requesterEmail: string, jobTitle: string, jobId: string) {
    await send(
      requesterEmail,
      `A tester has picked up "${jobTitle}"`,
      `<p>Good news! A tester has claimed your job <strong>${jobTitle}</strong> and will begin testing shortly.</p>
       <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/jobs/${jobId}">Track Progress</a></p>`
    )
  },

  async testComplete(requesterEmail: string, jobTitle: string, jobId: string, sessionId?: string) {
    const resultsUrl = sessionId
      ? `${process.env.NEXT_PUBLIC_APP_URL}/jobs/${jobId}/results`
      : `${process.env.NEXT_PUBLIC_APP_URL}/jobs/${jobId}`
    await send(
      requesterEmail,
      `Test complete: "${jobTitle}" — results ready`,
      `<p>Your test <strong>${jobTitle}</strong> has been completed by a tester.</p>
       <p>View the session replay, console logs, and tester feedback:</p>
       <p><a href="${resultsUrl}">View Results</a></p>`
    )
  },

  async payoutSent(testerEmail: string, amountCents: number) {
    await send(
      testerEmail,
      `Your BetaWindow payout of $${(amountCents / 100).toFixed(2)} has been processed`,
      `<p>Your payout of <strong>$${(amountCents / 100).toFixed(2)}</strong> has been sent.</p>
       <p>It typically arrives within 1–3 business days depending on your bank.</p>
       <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/tester/payouts">View Payouts</a></p>`
    )
  },

  async jobExpired(requesterEmail: string, jobTitle: string, jobId: string) {
    await send(
      requesterEmail,
      `Your job "${jobTitle}" has expired — credits refunded`,
      `<p>Your test job <strong>${jobTitle}</strong> was not claimed by a tester within 72 hours.</p>
       <p>Your credits have been automatically refunded to your account.</p>
       <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/jobs/new">Post a new job</a></p>`
    )
  },

  async disputeOpened(adminEmail: string, jobTitle: string, jobId: string, disputeReason: string) {
    await send(
      adminEmail,
      `Dispute opened for job "${jobTitle}"`,
      `<p>A requester has opened a dispute for job <strong>${jobTitle}</strong>.</p>
       <p><strong>Reason:</strong> ${disputeReason}</p>
       <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/disputes/${jobId}">Review Dispute</a></p>`
    )
  },
}
