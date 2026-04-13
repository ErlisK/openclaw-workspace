import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Setup Guide — GrantPilot Docs',
  description: 'How to set up GrantPilot — account creation, organization profile, first RFP parse, team invitation, and integration with grants.gov.',
  alternates: { canonical: 'https://pilotgrant.io/docs/setup' },
}

const STEPS = [
  {
    id: 'create-account',
    title: '1. Create your account',
    content: `Go to **app-limalabs.vercel.app/signup** and create an account with your work email.

You can sign up with:
- Email and password
- Google OAuth (recommended for organizations with Google Workspace)

After signup, you'll receive a verification email. Click the link to activate your account before proceeding.

**Note:** Use your organization's email domain — this allows team members to find your workspace when they sign up.`,
    links: [{ href: '/signup', label: 'Sign up now →' }],
  },
  {
    id: 'org-profile',
    title: '2. Set up your organization profile',
    content: `The onboarding wizard collects four things:

**Step 1 — Organization basics**
- Organization name (legal name as registered with IRS/state)
- Organization type (501(c)(3), Municipal, Neighborhood Association, etc.)
- Annual operating budget (used for grant matching and capacity assessment)

**Step 2 — Location & compliance**
- City and state (for geographic grant matching)
- EIN (Employer Identification Number) — required for federal grants. Format: XX-XXXXXXX

**Step 3 — Funder focus**
- Funder types you target (Federal, State, Foundation, CDBG, etc.)
- Program focus areas (up to 4 — Housing, Health, Youth, etc.)
- Annual grant goal (how many applications you want to submit this year)

All of this can be updated anytime in **Settings → Organization**.`,
    links: [{ href: '/onboarding', label: 'Complete onboarding →' }],
  },
  {
    id: 'parse-rfp',
    title: '3. Parse your first RFP',
    content: `Go to **RFP → New Application** (or click "New Application" from the dashboard).

**Option A — Upload a PDF**
Upload the RFP document directly. Supports PDFs up to 50MB, including scanned documents (OCR applied automatically).

**Option B — Paste a URL**
Paste any Grants.gov opportunity URL, foundation grants portal URL, or direct link to a PDF. GrantPilot fetches and parses the document automatically.

**Option C — Sample RFPs**
Click "🎯 Sample RFPs" to try with a pre-loaded sample: HUD CDBG, SAMHSA Behavioral Health, or RWJF Public Health. No upload needed.

**What gets extracted:**
- Eligibility criteria (org type, location, size requirements)
- Required narrative sections with page/word limits
- Application deadline and reporting dates
- Budget cap, minimum award, match requirements
- Scoring rubric and review criteria
- Required forms and attachments

Parsing typically completes in **20–45 seconds**.`,
    links: [{ href: '/rfp/new', label: 'Parse an RFP →' }],
  },
  {
    id: 'generate-narrative',
    title: '4. Generate your narrative',
    content: `After parsing, you'll see your application workspace with sections listed on the left.

**Click any section** to generate a draft. The AI:
1. Reads the RFP requirements for that section (page limit, required content, scoring criteria)
2. Uses your organization profile (name, type, budget, focus areas) to establish context
3. Generates a draft tuned to the funder's stated priorities

**Editing the draft:**
- Use the rich text editor to refine the AI draft
- Click "Regenerate" to get a new version with different emphasis
- Use section-level comments to guide the next regeneration

**Using your own templates:**
Go to Settings → Templates to upload past successful applications. The AI uses these as style references for future generations.`,
    links: [],
  },
  {
    id: 'build-budget',
    title: '5. Build your budget',
    content: `Go to the **Budget** tab in your application workspace.

**Add personnel:**
- Enter each position: name (or "TBD"), annual salary, FTE percentage
- Fringe benefit rate auto-calculates from your org's configured rate (set in Settings → Organization → Fringe Rate)

**Add other costs:**
- Travel: per-trip or monthly mileage
- Equipment: items >$5,000 with unit costs
- Supplies: categorized by type
- Contractual: subcontractor scopes and costs
- Indirect: auto-calculated from your NICRA or de minimis rate (10% MTDC)

**What gets generated:**
- Budget spreadsheet (download as Excel or CSV)
- Budget justification narrative (ready to paste)
- SF-424A data (pre-populated)

Your configured fringe rate and indirect cost rate are saved in Settings → Organization.`,
    links: [],
  },
  {
    id: 'export',
    title: '6. Export your submission package',
    content: `When your application is ready, go to the **Export** tab.

**What's in the ZIP:**
- Narrative document (Word .docx format)
- SF-424 form pre-populated
- SF-424A budget form pre-populated
- Compliance checklist
- Budget spreadsheet (Excel)
- Budget justification narrative (Word)

**Human QA review (Deliverable Pack and Pipeline Pro):**
Before export, you can request a specialist QA review. A vetted grant specialist reviews your application for:
- Narrative coherence and funder alignment
- Budget reasonableness and OMB compliance
- Completeness of required forms and attachments
- Common rejection triggers

QA turnaround: **48 hours** (business days). You'll receive a marked-up version with comments.

**Submitting to Grants.gov:**
Export your package and upload it manually to Grants.gov or the funder's submission portal. GrantPilot does not submit directly on your behalf (this prevents submission errors from automated processes).`,
    links: [{ href: '/rfp/new', label: 'Start your first application →' }],
  },
  {
    id: 'team',
    title: '7. Invite your team',
    content: `Go to **Settings → Team** to invite colleagues.

**Roles:**
- **Owner** — full access including billing, settings, and team management
- **Admin** — full access to applications, no billing access
- **Editor** — can create and edit applications
- **Viewer** — read-only access to all applications

**Invite workflow:**
1. Enter email address(es) and select role
2. Invitees receive an email with a link to create their account
3. They automatically join your organization workspace

Team collaboration features:
- Section-level comments and @mentions
- Approval workflows (request review from a specific team member)
- Activity log showing all changes by user`,
    links: [{ href: '/settings/team', label: 'Manage team →' }],
  },
]

export default function SetupGuidePage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
          <Link href="/docs" className="hover:text-indigo-600">Docs</Link>
          <span>›</span>
          <span>Setup Guide</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Setup Guide</h1>
        <p className="text-gray-500 text-lg">Get from signup to your first submission-ready package. Takes about 30 minutes for a typical first application.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {['Account', 'Org Profile', 'RFP Parse', 'Narrative', 'Budget', 'Export', 'Team'].map((tag, i) => (
            <span key={tag} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">{i + 1}. {tag}</span>
          ))}
        </div>
      </div>

      <div className="space-y-10">
        {STEPS.map(step => (
          <section key={step.id} id={step.id} className="scroll-mt-20">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              {step.title}
            </h2>
            <div className="prose prose-gray max-w-none text-sm leading-relaxed">
              {step.content.split('\n\n').map((para, i) => {
                if (para.startsWith('**') && para.endsWith('**') && para.split('**').length === 3) {
                  return <h3 key={i} className="font-semibold text-gray-800 mt-4 mb-1">{para.slice(2, -2)}</h3>
                }
                if (para.startsWith('- ') || para.includes('\n- ')) {
                  return (
                    <ul key={i} className="list-none space-y-1 my-2">
                      {para.split('\n').filter(l => l.startsWith('- ')).map((line, j) => (
                        <li key={j} className="flex gap-2 text-gray-600">
                          <span className="text-indigo-400 flex-shrink-0">•</span>
                          <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                        </li>
                      ))}
                    </ul>
                  )
                }
                return (
                  <p key={i} className="text-gray-600 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}
                  />
                )
              })}
            </div>
            {step.links.length > 0 && (
              <div className="mt-4 flex gap-3">
                {step.links.map(link => (
                  <Link key={link.href} href={link.href} className="text-sm text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-gray-100 pt-8">
        <h2 className="font-bold text-gray-900 mb-4">Next: Read the policies</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { href: '/docs/data-security', icon: '🔒', label: 'Data Security' },
            { href: '/docs/qa-escrow-policy', icon: '✅', label: 'QA & Escrow Policy' },
            { href: '/docs/sla', icon: '📋', label: 'Service Level Agreement' },
          ].map(l => (
            <Link key={l.href} href={l.href} className="p-4 border border-gray-200 rounded-xl hover:border-indigo-300 text-sm font-medium text-gray-700 flex items-center gap-2">
              <span>{l.icon}</span> {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
