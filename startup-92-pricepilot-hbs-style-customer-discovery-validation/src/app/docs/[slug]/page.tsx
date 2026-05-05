import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'

const docs: Record<string, { title: string; description: string; content: string }> = {
  quickstart: {
    title: 'Quickstart Guide',
    description: 'Get from zero to your first pricing experiment in under 10 minutes.',
    content: `
<h2>Connect Your Data Source</h2>
<p>PricingSim supports three connection methods:</p>
<h3>Stripe (API)</h3>
<p>Go to <strong>Settings → Connections</strong> and paste your Stripe API key (test or live). PricingSim validates the key and imports your last 200 charges automatically.</p>
<h3>Gumroad / Shopify CSV</h3>
<p>Export a CSV from your platform's dashboard, then drag it onto the <strong>Import</strong> page. PricingSim auto-detects the column format and maps fields.</p>
<h3>Generic CSV</h3>
<p>Any CSV with <code>Date</code>, <code>Product Name</code>, and <code>Amount</code> columns works. See the <a href="/import/guide">CSV guide</a> for the full field mapping.</p>

<hr />

<h2>Run the Engine</h2>
<p>Once you have data, go to <strong>Suggestions</strong>. The Bayesian engine analyzes your last 90 days and proposes 2–3 candidate prices with projected revenue lift.</p>
<p>Each suggestion shows: current price vs. suggested price, confidence score, and projected monthly revenue change.</p>

<hr />

<h2>Create an Experiment</h2>
<p>Pick a suggestion and click <strong>Create Experiment</strong>. This generates a public A/B page at <code>/x/&lt;your-experiment-slug&gt;</code>.</p>
<p>Share the link on your sales channels. PricingSim tracks conversions on both variants.</p>

<hr />

<h2>Preview and Roll Back</h2>
<p>On the Experiments page, you can preview what buyers see at each price, pause the experiment at any time, and roll back to Variant A with one click if results disappoint.</p>

<hr />

<h2>Upgrade to Pro</h2>
<p>The free plan supports 3 active experiments. Pro ($29/month) gives you unlimited experiments, AI-generated communication templates, CSV export, and priority support.</p>
<p><a href="/pricing">Upgrade to Pro →</a></p>
    `
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const doc = docs[slug]
  if (!doc) return { title: 'Not Found' }
  return { title: `${doc.title} — PricingSim Docs`, description: doc.description }
}

export default async function DocsPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = docs[slug]
  if (!doc) notFound()

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <Link href="/" style={{ color: '#6b7280', fontSize: '0.875rem', textDecoration: 'none' }}>PricingSim</Link>
        <span style={{ color: '#d1d5db' }}>›</span>
        <Link href="/docs" style={{ color: '#6b7280', fontSize: '0.875rem', textDecoration: 'none' }}>Docs</Link>
      </div>

      <article data-testid="docs-post-content">
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem' }}>{doc.title}</h1>
        <div
          style={{ lineHeight: 1.75, color: '#374151' }}
          dangerouslySetInnerHTML={{ __html: doc.content }}
        />
      </article>

      <div style={{ marginTop: '2rem' }}>
        <Link href="/docs" style={{ color: 'var(--brand, #4f46e5)', fontSize: '0.9rem', textDecoration: 'none' }}>
          ← All docs
        </Link>
      </div>
    </main>
  )
}
