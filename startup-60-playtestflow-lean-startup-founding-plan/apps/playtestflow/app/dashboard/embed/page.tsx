import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import EmbedCodeGenerator from '@/components/EmbedCodeGenerator'

export default async function EmbedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get all recruiting/scheduled sessions for this designer
  const { data: sessions } = await supabase
    .from('playtest_sessions')
    .select('id, title, status, max_testers, platform, projects(name)')
    .eq('designer_id', user.id)
    .in('status', ['recruiting', 'scheduled'])
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Widget Generator</h1>
        <p className="text-gray-400 text-sm mt-1">
          Get an embeddable signup widget for your blog, itch.io page, or any site.
        </p>
      </div>

      {!sessions || sessions.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h2 className="text-lg font-bold mb-2">No active sessions</h2>
          <p className="text-gray-400 text-sm">
            Create a session with <strong>recruiting</strong> or <strong>scheduled</strong> status to generate a widget.
          </p>
          <a
            href="/dashboard"
            className="inline-block mt-4 text-orange-400 text-sm underline"
          >
            Go to Projects →
          </a>
        </div>
      ) : (
        <EmbedCodeGenerator sessions={sessions as any[]} />
      )}

      {/* Docs */}
      <div className="mt-12 space-y-6">
        <h2 className="text-lg font-semibold">How the Widget Works</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: '1️⃣',
              title: 'Script tag',
              desc: 'Drop one <script> tag anywhere on your site. It renders the signup form inline with zero dependencies.',
            },
            {
              icon: '2️⃣',
              title: 'Tester fills in the form',
              desc: 'Name, email, optional role, and a consent checkbox. Submissions go straight to your Supabase session.',
            },
            {
              icon: '3️⃣',
              title: 'See signups in your dashboard',
              desc: 'Every signup appears in your session\'s tester roster — ready to assign reward codes and mark attendance.',
            },
          ].map((s) => (
            <div key={s.title} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-2xl mb-2">{s.icon}</div>
              <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
