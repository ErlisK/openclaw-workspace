import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

interface Props { params: Promise<{ sessionId: string }> }

interface TrialPage {
  id: string
  page_number: number
  subject: string | null
  image_url: string
  sort_order: number
}

async function getSession(sessionId: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const [{ data: session }, { data: pages }] = await Promise.all([
    sb.from('trial_sessions').select('*').eq('id', sessionId).single(),
    sb.from('trial_pages').select('*').eq('session_id', sessionId).eq('status', 'complete').order('sort_order'),
  ])
  return { session, pages: (pages || []) as TrialPage[] }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sessionId } = await params
  const { session } = await getSession(sessionId)
  const heroName = (session?.config?.heroName as string) || 'My Book'
  return { title: `Print: ${heroName}'s Coloring Book — KidColoring` }
}

export default async function PrintPage({ params }: Props) {
  const { sessionId } = await params
  const { session, pages } = await getSession(sessionId)
  const heroName = (session?.config?.heroName as string) || 'My Coloring Book'

  return (
    <div style={{ fontFamily: '-apple-system, sans-serif', background: 'white', minHeight: '100vh' }}>
      {/* Print CSS */}
      <style>{`
        @media print {
          @page { size: letter; margin: 0.5in; }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; break-after: page; }
          .coloring-page { page-break-inside: avoid; break-inside: avoid; }
        }
        .no-print { background: #f5f3ff; padding: 1rem; text-align: center; border-bottom: 1px solid #ddd; }
        .cover { text-align: center; padding: 2in 1in; border: 3px solid #8b5cf6; border-radius: 16px; margin: 0.5in auto; max-width: 7.5in; }
        .page { max-width: 7.5in; margin: 0 auto 1in; }
        .coloring-page img { width: 100%; height: auto; display: block; border: 2px solid #e5e7eb; border-radius: 8px; }
        .page-label { font-size: 0.8rem; color: #9ca3af; padding: 0.5rem 0; text-align: center; }
      `}</style>

      {/* Instructions (hidden when printing) */}
      <div className="no-print">
        <p style={{ margin: 0, fontWeight: 'bold', color: '#7c3aed' }}>
          Press Ctrl+P (or Cmd+P on Mac) → Choose &quot;Save as PDF&quot; or select your printer
        </p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
          Tip: Set margins to &quot;Minimum&quot; for best results
          &nbsp;·&nbsp;
          <a href={`/create/preview/${sessionId}`} style={{ color: '#7c3aed' }}>← Back to book</a>
        </p>
      </div>

      {/* Cover */}
      <div className="page page-break">
        <div className="cover">
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎨</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#7c3aed', margin: '0 0 0.5rem' }}>
            {heroName}&apos;s Coloring Book
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>Made with KidColoring</p>
          <p style={{ marginTop: '2rem', color: '#9ca3af', fontSize: '0.9rem' }}>
            {pages.length} custom pages inside
          </p>
        </div>
      </div>

      {/* Coloring pages */}
      {pages.map((page, idx) => (
        <div key={page.id} className={`page coloring-page${idx < pages.length - 1 ? ' page-break' : ''}`}>
          <div className="page-label">Page {idx + 1} · {page.subject || `Page ${page.page_number}`}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.image_url} alt={page.subject || `Page ${page.page_number}`} />
          <div className="page-label">KidColoring · kidcoloring.vercel.app</div>
        </div>
      ))}

      {/* Back cover */}
      <div className="page" style={{ textAlign: 'center', paddingTop: '3in', color: '#9ca3af' }}>
        <p style={{ fontSize: '1.5rem' }}>🎨</p>
        <p style={{ fontWeight: 'bold', color: '#7c3aed' }}>Made with KidColoring</p>
        <p style={{ fontSize: '0.85rem' }}>Create your own at kidcoloring.vercel.app</p>
      </div>
    </div>
  )
}
