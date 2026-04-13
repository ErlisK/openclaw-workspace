import Link from 'next/link'

export const metadata = {
  title: 'PlaytestFlow Docs',
  description: 'Documentation for PlaytestFlow — the playtest pipeline for indie game designers.',
}

const sections = [
  {
    href: '/docs/embed',
    icon: '🔌',
    title: 'Embed SDK',
    desc: 'Add a recruit widget to any website in 2 lines of code. Async loader, theme options, postMessage events.',
  },
  {
    href: '/docs/quickstart',
    icon: '🚀',
    title: 'Quickstart',
    desc: 'From account creation to your first live playtest session in under 10 minutes.',
  },
  {
    href: '/docs/embed#api-reference',
    icon: '📖',
    title: 'API Reference',
    desc: 'init(), setTheme(), destroy() — full SDK method reference with types.',
  },
  {
    href: '/docs/embed#themes',
    icon: '🎨',
    title: 'Themes & Styling',
    desc: 'Dark, light, auto, and fully custom accent colors. Match your site perfectly.',
  },
]

export default function DocsIndex() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#f0f6fc]">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-14">
          <Link href="/" className="text-[#ff6600] font-bold text-lg tracking-tight">
            PlaytestFlow
          </Link>
          <div className="mt-8">
            <div className="inline-flex items-center gap-2 bg-[#ff6600]/10 border border-[#ff6600]/20 rounded-full px-3 py-1 text-xs text-[#ff6600] font-medium mb-4">
              Documentation
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-4">
              PlaytestFlow Docs
            </h1>
            <p className="text-[#8b949e] text-lg max-w-xl">
              Everything you need to recruit testers, run sessions, and collect feedback —
              from embed widgets to full pipeline automation.
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 gap-4 mb-16">
          {sections.map(s => (
            <Link key={s.href} href={s.href}
              className="group bg-white/5 hover:bg-white/8 border border-white/10 hover:border-[#ff6600]/30 rounded-2xl p-6 transition-all">
              <div className="text-2xl mb-3">{s.icon}</div>
              <div className="font-semibold text-white group-hover:text-[#ff6600] transition-colors mb-1">{s.title}</div>
              <div className="text-sm text-[#8b949e] leading-relaxed">{s.desc}</div>
            </Link>
          ))}
        </div>

        {/* Quick copy */}
        <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
          <div className="text-sm font-semibold text-[#8b949e] uppercase tracking-wide mb-3">Quick Install</div>
          <pre className="text-sm text-[#f0f6fc] font-mono leading-relaxed overflow-x-auto">{`<script>
(function(w,d,s,o,f,js,fjs){
  w['PlaytestFlow']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
  js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
  js.id='ptf-sdk';js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
}(window,document,'script','PlaytestFlow',
  'https://playtestflow.vercel.app/api/embed/script'));
PlaytestFlow('init',{session:'YOUR_SESSION_ID',theme:'dark'});
</script>`}</pre>
          <div className="mt-4">
            <Link href="/docs/embed" className="text-[#ff6600] text-sm font-medium hover:underline">
              Full embed documentation →
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-[#8b949e]">
          Questions?{' '}
          <a href="mailto:hello@playtestflow.com" className="text-[#ff6600] hover:underline">hello@playtestflow.com</a>
          {' · '}
          <a href="https://discord.gg/playtestflow" className="text-[#ff6600] hover:underline">Discord community</a>
        </div>
      </div>
    </div>
  )
}
