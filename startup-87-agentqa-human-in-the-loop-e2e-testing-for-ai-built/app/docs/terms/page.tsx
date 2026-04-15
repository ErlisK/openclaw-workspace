import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — AgentQA',
  description: 'AgentQA terms of service governing use of the platform for job creators and testers.',
}

const EFFECTIVE = 'June 1, 2025'

export default function TermsPage() {
  return (
    <article data-testid="docs-terms">
      <h1>Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Effective date: {EFFECTIVE}</p>

      <p>
        These Terms of Service ("<strong>Terms</strong>") govern your access to and use of AgentQA
        ("<strong>AgentQA</strong>", "<strong>we</strong>", "<strong>us</strong>"). By creating an
        account or using the platform you agree to these Terms.
      </p>

      <h2>1. Description of service</h2>
      <p>
        AgentQA is a marketplace that connects software developers ("Job Creators") with freelance
        software testers ("Testers"). Job Creators publish test jobs; Testers claim and complete them
        in exchange for compensation.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old and legally able to enter into contracts in your jurisdiction.
        By using AgentQA you represent that you meet these requirements.
      </p>

      <h2>3. Accounts</h2>
      <p>
        You are responsible for maintaining the security of your credentials. You must notify us
        immediately at <a href="mailto:support@agentqa.io">support@agentqa.io</a> if you suspect
        unauthorised access. We are not liable for losses resulting from compromised credentials.
      </p>

      <h2>4. Credits and payments</h2>
      <ul>
        <li>Credits are purchased in advance via Stripe Checkout.</li>
        <li>Credits are non-refundable except where required by law or our refund policy (§5).</li>
        <li>Credits have no cash value and are not transferable between accounts.</li>
        <li>Prices may change; existing purchased credits are unaffected.</li>
      </ul>

      <h2>5. Refund policy</h2>
      <p>
        Unused credits (never spent on a job) may be refunded within 30 days of purchase by contacting
        support. Credits spent on a job that was subsequently rejected and re-queued remain on hold
        and are not separately refundable.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>Submit job URLs that point to malicious, illegal, or CSAM content</li>
        <li>Attempt to use the platform to attack, probe, or enumerate internal infrastructure</li>
        <li>Submit fraudulent feedback or collude with other users to game quality scores</li>
        <li>Reverse-engineer or scrape the platform beyond normal browsing</li>
        <li>Use the platform to test applications you do not have authorisation to test</li>
      </ul>

      <h2>7. Tester obligations</h2>
      <p>
        Testers agree to: follow job instructions in good faith; submit honest feedback; not share
        job content outside the platform; and maintain confidentiality of any proprietary information
        encountered during testing.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        Job Creators retain all rights to their applications. Feedback reports are owned by the Job
        Creator. AgentQA retains the right to use aggregated, anonymised data to improve the platform.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        The platform is provided "as is". AgentQA makes no warranty that testing sessions will catch
        all bugs or that tester feedback is professional-grade QA. Use alongside automated testing.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, AgentQA's aggregate liability for any claim is
        limited to the credits you paid in the 30 days preceding the claim.
      </p>

      <h2>11. Termination</h2>
      <p>
        We may suspend or terminate accounts that violate these Terms. You may close your account
        at any time; unused credits will be refunded per §5.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by the laws of Delaware, USA. Disputes will be resolved by
        binding arbitration under JAMS rules.
      </p>

      <h2>13. Changes</h2>
      <p>
        We will post updated Terms at least 14 days before they take effect. Continued use after
        the effective date constitutes acceptance.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions? Email <a href="mailto:legal@agentqa.io">legal@agentqa.io</a>.
      </p>
    </article>
  )
}
