import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — BetaWindow',
  description: 'Terms and conditions for using the BetaWindow platform.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-gray-900">BetaWindow</Link>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-16 prose prose-gray">
        <h1>Terms of Service</h1>
        <p className="text-sm text-gray-500">Last updated: April 17, 2026</p>

        <p>These Terms of Service (&quot;Terms&quot;) govern your access to and use of the BetaWindow platform at betawindow.com (&quot;Service&quot;), operated by BetaWindow (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.</p>

        <h2>1. Eligibility</h2>
        <p>You must be at least 18 years old to use BetaWindow. By using the Service, you represent and warrant that you are 18 or older and have the legal capacity to enter into a binding agreement.</p>

        <h2>2. Account Registration</h2>
        <p>You must create an account to use the Service. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You agree to provide accurate and current information and to notify us immediately of any unauthorized account access.</p>

        <h2>3. The BetaWindow Marketplace</h2>
        <p>BetaWindow is a two-sided marketplace connecting:</p>
        <ul>
          <li><strong>Requesters:</strong> Developers and teams who submit web applications for human testing.</li>
          <li><strong>Testers:</strong> Independent individuals who complete test sessions and submit reports.</li>
        </ul>
        <p>BetaWindow acts solely as a platform intermediary and is not a party to transactions between requesters and testers. We do not guarantee any particular test outcome, report quality, or turnaround time beyond what is specified in these Terms.</p>

        <h2>4. Credits and Payments (Requesters)</h2>
        <p>4.1 Credits are purchased in advance at a rate of $1 USD per credit. Test tiers cost 5 credits (Quick), 10 credits (Standard), or 15 credits (Deep).</p>
        <p>4.2 Credits are deducted when you publish a test job.</p>
        <p>4.3 <strong>Refunds:</strong> Credits are automatically refunded if no tester claims your job within 24 hours. If you dispute a delivered report, you may open a dispute within 48 hours of report delivery. Refunds for disputes are issued at our sole discretion following review.</p>
        <p>4.4 Credits expire 12 months from purchase. We will notify you by email before expiration.</p>
        <p>4.5 All payments are processed by Stripe, Inc. and are subject to Stripe&apos;s terms. BetaWindow does not store payment card data.</p>

        <h2>5. Tester Earnings and Payouts</h2>
        <p>5.1 Testers earn the stated amount per completed test once the requester approves the report (or after 24 hours with no dispute).</p>
        <p>5.2 Payouts are processed via Stripe Payouts to a bank account in a Stripe-supported country. Payouts typically settle within 1–2 business days.</p>
        <p>5.3 <strong>Independent Contractor Relationship:</strong> Testers are independent contractors, not employees of BetaWindow. BetaWindow does not provide benefits, insurance, or employment protections. You are solely responsible for all taxes on your earnings, including self-employment tax. Where required by applicable law (including IRS thresholds), BetaWindow will issue IRS Form 1099-NEC or 1099-K for earnings meeting applicable reporting thresholds. You agree to provide accurate tax identification information upon request.</p>
        <p>5.4 BetaWindow reserves the right to withhold payment for reports determined to be fraudulent, low-effort, or submitted in bad faith, and to suspend or terminate tester accounts for repeated violations.</p>

        <h2>6. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Submit URLs for apps you do not have authorization to test.</li>
          <li>Submit apps containing malicious code, illegal content, or content designed to harm testers.</li>
          <li>Submit fraudulent or fabricated test reports.</li>
          <li>Attempt to circumvent payment, rating, or dispute systems.</li>
          <li>Use the Service to test apps that expose production personal data of third parties without their authorization.</li>
          <li>Violate any applicable law or third-party rights.</li>
        </ul>

        <h2>7. Test Session Data and Intellectual Property</h2>
        <p>7.1 You retain ownership of any content you submit to the Service (test instructions, app URLs, tester reports).</p>
        <p>7.2 You grant BetaWindow a limited license to process, store, and display your content as necessary to operate the Service.</p>
        <p>7.3 Session recordings, network logs, and console logs captured during a test session are accessible to the requester who commissioned the test and to BetaWindow for quality assurance and dispute resolution.</p>
        <p>7.4 By submitting an app for testing, you warrant that you are authorized to expose that app&apos;s network traffic and UI to a third-party tester, and that the test environment does not contain production personal data of third parties unless you have their explicit authorization.</p>
        <p>7.5 Session data is automatically deleted 90 days after job completion.</p>

        <h2>8. AI-Generated Content</h2>
        <p>Some test reports include AI-generated summaries. These summaries are produced automatically and may not be fully accurate. AI summaries are provided for convenience only and do not substitute for review of the full tester report and session recordings. BetaWindow makes no warranty regarding the accuracy of AI-generated content.</p>

        <h2>9. Disclaimer of Warranties</h2>
        <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT DEFECTS WILL BE CORRECTED. REPORT TURNAROUND TIMES ARE ESTIMATES ONLY AND ARE SUBJECT TO TESTER AVAILABILITY.</p>

        <h2>10. Limitation of Liability</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, BETAWINDOW SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, ARISING OUT OF OR RELATING TO YOUR USE OF THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE 90 DAYS BEFORE THE CLAIM, OR (B) $50 USD.</p>

        <h2>11. Indemnification</h2>
        <p>You agree to indemnify and hold harmless BetaWindow and its officers, directors, and employees from any claims, damages, or expenses (including reasonable attorneys&apos; fees) arising from your use of the Service, your submitted content, or your violation of these Terms.</p>

        <h2>12. Dispute Resolution</h2>
        <p>These Terms are governed by the laws of the State of California, without regard to its conflict of law provisions. Any dispute arising from these Terms shall be resolved by binding arbitration under the JAMS Streamlined Arbitration Rules, conducted in San Francisco, California, except that either party may seek injunctive relief in any court of competent jurisdiction. You waive any right to participate in class action litigation or class-wide arbitration.</p>

        <h2>13. Termination</h2>
        <p>We may suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or any reason at our discretion with 5 days&apos; notice (or immediately for serious violations). Upon termination, any unused credits will be refunded on a pro-rated basis at our discretion.</p>

        <h2>14. Changes to These Terms</h2>
        <p>We may update these Terms at any time. We will provide at least 14 days&apos; notice via email before material changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms.</p>

        <h2>15. Contact</h2>
        <p>Questions about these Terms? Contact us at <a href="mailto:hello@betawindow.com">hello@betawindow.com</a>.</p>
      </main>
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-sm">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white">Terms of Service</Link>
          <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
          <a href="mailto:hello@betawindow.com" className="hover:text-white">Contact</a>
        </div>
        <p>© {new Date().getFullYear()} BetaWindow · 2298 Johanna Court, Pinole, CA 94564 · <a href="mailto:hello@betawindow.com" className="hover:text-white">hello@betawindow.com</a></p>
      </footer>
    </div>
  )
}
