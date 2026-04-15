import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AgentQA — Follow Us',
  description: 'Connect with AgentQA on Twitter, LinkedIn, and other platforms.',
}

const DEPLOYED = 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-nargzynwo.vercel.app'

export default function SocialPage() {
  const profiles = [
    {
      platform: 'X / Twitter',
      handle: '@AgentQA_io',
      url: 'https://twitter.com/AgentQA_io',
      setupUrl: 'https://twitter.com/i/flow/signup',
      icon: '🐦',
      color: 'bg-black',
      textColor: 'text-white',
      status: 'pending',
      bio: 'Human QA for AI-built apps. Real testers, real bugs, from $5.',
    },
    {
      platform: 'LinkedIn',
      handle: 'AgentQA',
      url: 'https://www.linkedin.com/company/agentqa',
      setupUrl: 'https://www.linkedin.com/company/setup/new',
      icon: '💼',
      color: 'bg-blue-700',
      textColor: 'text-white',
      status: 'pending',
      bio: 'Testing marketplace for AI-built apps.',
    },
    {
      platform: 'GitHub',
      handle: 'ErlisK/openclaw-workspace',
      url: 'https://github.com/ErlisK/openclaw-workspace',
      setupUrl: null,
      icon: '🐙',
      color: 'bg-gray-900',
      textColor: 'text-white',
      status: 'live',
      bio: 'Open source code in the AgentQA workspace.',
    },
    {
      platform: 'Product Hunt',
      handle: 'AgentQA',
      url: `https://www.producthunt.com/?utm_source=producthunt&utm_medium=launch&utm_campaign=ph_launch`,
      setupUrl: 'https://www.producthunt.com/posts/new',
      icon: '🚀',
      color: 'bg-orange-500',
      textColor: 'text-white',
      status: 'pending',
      bio: 'Launching soon on Product Hunt.',
    },
  ]

  const posts = [
    {
      platform: 'X / Twitter',
      icon: '🐦',
      content: `🤖 + 👤 = ✅

We just launched AgentQA — a testing marketplace for the AI agent era.

AI agents can write code. They can't tell if it *works*.

Real human testers. Network logs. Console captures. From $5.

🔗 ${DEPLOYED}?utm_source=twitter&utm_medium=social&utm_campaign=twitter_launch

#AI #testing #buildinpublic`,
      utm: `${DEPLOYED}?utm_source=twitter&utm_medium=social&utm_campaign=twitter_launch`,
    },
    {
      platform: 'LinkedIn',
      icon: '💼',
      content: `🚀 We just launched AgentQA.

AI coding agents are shipping real apps every day. The missing piece? Human validation.

AgentQA is a testing marketplace where AI agents hire real testers:
→ Post a job via API or dashboard
→ Human tester claims it in minutes
→ Get back: network logs + console captures + bug report

Starting at $5/test.

${DEPLOYED}?utm_source=linkedin&utm_medium=social&utm_campaign=linkedin_launch

#AI #QualityAssurance #DevTools #Startup`,
      utm: `${DEPLOYED}?utm_source=linkedin&utm_medium=social&utm_campaign=linkedin_launch`,
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Social Presence</span>
        <h1 className="text-4xl font-bold mt-4 mb-2">Follow AgentQA</h1>
        <p className="text-xl text-gray-600">Stay up to date with launches, product updates, and build-in-public content.</p>
      </div>

      {/* Social Profiles */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Profiles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map(p => (
            <div key={p.platform} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className={`${p.color} ${p.textColor} px-5 py-4`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <div className="font-bold text-lg">{p.platform}</div>
                    <div className="text-sm opacity-80">{p.handle}</div>
                  </div>
                  <div className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                    p.status === 'live' ? 'bg-green-400 text-green-900' : 'bg-white/20 text-white'
                  }`}>
                    {p.status === 'live' ? '🟢 Live' : '⏳ Coming soon'}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-3">{p.bio}</p>
                <div className="flex gap-2">
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                     className="text-sm text-indigo-600 hover:underline font-medium">
                    View profile →
                  </a>
                  {p.setupUrl && (
                    <span className="text-sm text-gray-400">|</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Latest Posts */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Launch Posts</h2>
        <div className="space-y-6">
          {posts.map(p => (
            <div key={p.platform} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{p.icon}</span>
                <span className="font-semibold">{p.platform}</span>
                <span className="ml-auto">
                  <a href={p.utm} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-indigo-600 hover:underline">
                    UTM link →
                  </a>
                </span>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans bg-gray-50 rounded-lg p-4">
                {p.content}
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* UTM Links Reference */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Tracked Links</h2>
        <div className="bg-gray-50 rounded-xl p-5 text-sm space-y-2">
          {[
            ['Twitter Bio', 'twitter_bio'],
            ['Twitter Launch', 'twitter_launch'],
            ['LinkedIn Bio', 'linkedin_bio'],
            ['LinkedIn Launch', 'linkedin_launch'],
            ['LinkedIn How-To', 'linkedin_howto'],
            ['LinkedIn Story', 'linkedin_story'],
            ['Product Hunt', 'ph_launch'],
            ['Hacker News', 'hn_launch'],
          ].map(([label, campaign]) => (
            <div key={campaign} className="flex gap-2 flex-wrap">
              <span className="text-gray-500 w-32 shrink-0">{label}:</span>
              <a
                href={`${DEPLOYED}?utm_source=${campaign.split('_')[0]}&utm_medium=social&utm_campaign=${campaign}`}
                target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 hover:underline break-all font-mono text-xs"
              >
                {DEPLOYED}?utm_source={campaign.split('_')[0]}&utm_medium=social&utm_campaign={campaign}
              </a>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center text-gray-500 text-sm">
        <p>Press kit at <a href="/launch" className="text-indigo-600 hover:underline">/launch</a></p>
      </div>
    </div>
  )
}
