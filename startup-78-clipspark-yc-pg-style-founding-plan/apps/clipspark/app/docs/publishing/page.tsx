import Link from 'next/link'

export const metadata = {
  title: 'Publishing Documentation — ClipSpark',
  description: 'Setup guides for YouTube, LinkedIn, TikTok, and Instagram publishing integrations.',
  robots: { index: false },
}

export default function PublishingDocsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-500 hover:text-white text-sm">← Dashboard</Link>
        <span className="text-gray-700">/</span>
        <Link href="/help" className="text-gray-500 hover:text-white text-sm">Help</Link>
        <span className="text-gray-700">/</span>
        <span className="text-sm text-white">Publishing Docs</span>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-14">
        <div>
          <h1 className="text-3xl font-bold mb-3">Publishing Integration Docs</h1>
          <p className="text-gray-400">Setup, compliance, and troubleshooting for all platform integrations.</p>
        </div>

        {/* Status table */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Integration Status</h2>
          <div className="border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="text-left px-4 py-3 text-gray-400">Platform</th>
                  <th className="text-left px-4 py-3 text-gray-400">Status</th>
                  <th className="text-left px-4 py-3 text-gray-400">Method</th>
                  <th className="text-left px-4 py-3 text-gray-400">Requirements</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { platform: 'YouTube Shorts', status: '✅ Live', method: 'YouTube Data API v3 (resumable upload)', req: 'GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET' },
                  { platform: 'LinkedIn Video', status: '✅ Live', method: 'LinkedIn Videos API 2024 + ugcPosts v2 fallback', req: 'LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET' },
                  { platform: 'TikTok', status: '⚠️ Deep-link', method: 'Deep-link + Buffer API if configured', req: 'TikTok Content API requires app approval' },
                  { platform: 'Instagram Reels', status: '⚠️ Deep-link', method: 'Meta Graph API + Buffer fallback', req: 'Meta App approval + business account' },
                ].map(row => (
                  <tr key={row.platform} className="border-b border-gray-800/50">
                    <td className="px-4 py-3 font-medium">{row.platform}</td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{row.method}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">{row.req}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* YouTube */}
        <section id="youtube">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">▶️</span>
            <div>
              <h2 className="text-lg font-semibold">YouTube Shorts</h2>
              <span className="text-xs bg-green-900/40 border border-green-800/40 text-green-400 px-2 py-0.5 rounded-full">Live</span>
            </div>
          </div>
          <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
            <p>YouTube publishing uses the <strong>YouTube Data API v3</strong> with resumable upload. OAuth2 with offline access gives ClipSpark a refresh token so uploads don&apos;t require re-authentication.</p>

            <h3 className="text-white font-medium mt-6">Required environment variables</h3>
            <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs font-mono text-gray-300 overflow-auto">
{`GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret
NEXT_PUBLIC_APP_URL=https://clipspark-tau.vercel.app`}
            </pre>

            <h3 className="text-white font-medium mt-6">Google Cloud Console setup</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-400">
              <li>Create a project at <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">console.cloud.google.com</a></li>
              <li>Enable <strong className="text-white">YouTube Data API v3</strong></li>
              <li>Create OAuth 2.0 credentials (Web application)</li>
              <li>Add authorized redirect URI: <code className="bg-gray-800 px-1 rounded">https://clipspark-tau.vercel.app/api/connect/youtube/callback</code></li>
              <li>Set scopes: <code className="bg-gray-800 px-1 rounded">youtube.upload</code> + <code className="bg-gray-800 px-1 rounded">youtube.readonly</code></li>
              <li>If app is in testing mode, add test users in the OAuth consent screen</li>
              <li>Submit for verification before going live with external users</li>
            </ol>

            <h3 className="text-white font-medium mt-6">Compliance notes</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-400 text-xs">
              <li>YouTube TOS prohibits automated posting of content that violates community guidelines</li>
              <li>Shorts must be ≤60 seconds (vertical, 9:16). ClipSpark enforces this at render time.</li>
              <li>Title max 100 characters, description max 5,000 characters, tags max 30 items</li>
              <li>Privacy status set to <code className="bg-gray-800 px-1 rounded">public</code> by default — users can change before approving</li>
              <li>ClipSpark does not store Google access tokens unencrypted at rest (stored in Supabase with RLS)</li>
              <li>Token refresh handled automatically 60 seconds before expiry</li>
            </ul>
          </div>
        </section>

        {/* LinkedIn */}
        <section id="linkedin">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💼</span>
            <div>
              <h2 className="text-lg font-semibold">LinkedIn Video</h2>
              <span className="text-xs bg-green-900/40 border border-green-800/40 text-green-400 px-2 py-0.5 rounded-full">Live</span>
            </div>
          </div>
          <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
            <p>LinkedIn publishing uses the <strong>LinkedIn Videos API (2024+)</strong> with chunked resumable upload, with automatic fallback to the legacy <code className="bg-gray-800 px-1 rounded">ugcPosts v2</code> API if the new endpoint returns 404.</p>
            <p>Token refresh is supported: ClipSpark will refresh the access token automatically if it&apos;s within 2 minutes of expiry.</p>

            <h3 className="text-white font-medium mt-6">Required environment variables</h3>
            <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs font-mono text-gray-300 overflow-auto">
{`LINKEDIN_CLIENT_ID=your-app-client-id
LINKEDIN_CLIENT_SECRET=your-app-client-secret
NEXT_PUBLIC_APP_URL=https://clipspark-tau.vercel.app`}
            </pre>

            <h3 className="text-white font-medium mt-6">LinkedIn Developer Portal setup</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-400">
              <li>Create an app at <a href="https://developer.linkedin.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">developer.linkedin.com</a></li>
              <li>Add products: <strong className="text-white">Share on LinkedIn</strong> + <strong className="text-white">Sign In with LinkedIn using OpenID Connect</strong></li>
              <li>Add authorized redirect URL: <code className="bg-gray-800 px-1 rounded">https://clipspark-tau.vercel.app/api/connect/linkedin/callback</code></li>
              <li>Required scopes: <code className="bg-gray-800 px-1 rounded">openid profile email w_member_social</code></li>
              <li>Request review for <strong className="text-white">w_member_social</strong> if not automatically approved</li>
            </ol>

            <h3 className="text-white font-medium mt-6">Compliance notes</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-400 text-xs">
              <li>LinkedIn TOS prohibits automated posting that mimics human behavior or posts at unnatural frequency</li>
              <li>Video limits: max 5GB, max 10 minutes, min 3 seconds. ClipSpark outputs are within limits.</li>
              <li>Caption max 3,000 characters. ClipSpark truncates automatically.</li>
              <li>LinkedIn access tokens expire in ~60 days. Refresh tokens extend this.</li>
              <li>All posts are set to PUBLIC visibility by default</li>
            </ul>
          </div>
        </section>

        {/* TikTok */}
        <section id="tiktok">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🎵</span>
            <div>
              <h2 className="text-lg font-semibold">TikTok</h2>
              <span className="text-xs bg-yellow-900/30 border border-yellow-800/30 text-yellow-400 px-2 py-0.5 rounded-full">Deep-link / Buffer</span>
            </div>
          </div>
          <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
            <p>TikTok&apos;s <strong>Content Posting API</strong> requires developer app approval from TikTok. Until approved, ClipSpark uses a deep-link fallback (download + manual upload) or Buffer if configured.</p>

            <h3 className="text-white font-medium mt-6">Current behavior</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-400">
              <li>If <code className="bg-gray-800 px-1 rounded">BUFFER_ACCESS_TOKEN</code> is set: schedules via Buffer to TikTok</li>
              <li>Otherwise: returns download URL + deep-link for manual posting</li>
            </ol>

            <h3 className="text-white font-medium mt-6">Path to TikTok Content API</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-400">
              <li>Create developer account at <a href="https://developers.tiktok.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">developers.tiktok.com</a></li>
              <li>Create an app, request <strong className="text-white">Content Posting API</strong> access</li>
              <li>Complete TikTok&apos;s app review process (typically 2–4 weeks)</li>
              <li>Required scope: <code className="bg-gray-800 px-1 rounded">video.publish</code></li>
              <li>Add env vars: <code className="bg-gray-800 px-1 rounded">TIKTOK_CLIENT_KEY</code>, <code className="bg-gray-800 px-1 rounded">TIKTOK_CLIENT_SECRET</code></li>
              <li>Implement OAuth flow at <code className="bg-gray-800 px-1 rounded">/api/connect/tiktok/auth</code> (not yet built)</li>
            </ol>

            <h3 className="text-white font-medium mt-6">Buffer fallback setup</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-400">
              <li>Create account at <a href="https://buffer.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">buffer.com</a></li>
              <li>Connect your TikTok account in Buffer</li>
              <li>Get access token from Buffer → Settings → Apps</li>
              <li>Set <code className="bg-gray-800 px-1 rounded">BUFFER_ACCESS_TOKEN</code> in Vercel env vars</li>
            </ol>

            <h3 className="text-white font-medium mt-6">TikTok compliance notes</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-400 text-xs">
              <li>TikTok video max: 10 min (Shorts format: ≤60s recommended). ClipSpark outputs are within limits.</li>
              <li>Caption max: 2,200 characters including hashtags</li>
              <li>Max 30 hashtags per post</li>
              <li>TikTok Content API requires content to not violate Community Guidelines at the API level</li>
              <li>Third-party uploaders must disclose they&apos;re using automated tools — ClipSpark includes this in creator-facing UI</li>
            </ul>
          </div>
        </section>

        {/* Instagram */}
        <section id="instagram">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📸</span>
            <div>
              <h2 className="text-lg font-semibold">Instagram Reels</h2>
              <span className="text-xs bg-yellow-900/30 border border-yellow-800/30 text-yellow-400 px-2 py-0.5 rounded-full">Meta App Approval Required</span>
            </div>
          </div>
          <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
            <p>Instagram Reels publishing uses the <strong>Meta Graph API</strong>. This requires a Facebook App with Instagram permissions and an Instagram Business or Creator account.</p>

            <h3 className="text-white font-medium mt-6">Required environment variables</h3>
            <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs font-mono text-gray-300 overflow-auto">
{`INSTAGRAM_ACCESS_TOKEN=long-lived-access-token
INSTAGRAM_USER_ID=instagram-user-id
# OR use Buffer:
BUFFER_ACCESS_TOKEN=buffer-access-token`}
            </pre>

            <h3 className="text-white font-medium mt-6">Meta Developer setup</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-400">
              <li>Create app at <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">developers.facebook.com</a></li>
              <li>Add <strong className="text-white">Instagram Graph API</strong> product</li>
              <li>Required permissions: <code className="bg-gray-800 px-1 rounded">instagram_basic</code>, <code className="bg-gray-800 px-1 rounded">instagram_content_publish</code></li>
              <li>Instagram account must be Business or Creator type</li>
              <li>Connect Instagram account to a Facebook Page</li>
              <li>Submit app for review with the <code className="bg-gray-800 px-1 rounded">instagram_content_publish</code> permission</li>
              <li>Generate long-lived access token (60-day expiry — implement refresh for production)</li>
            </ol>

            <h3 className="text-white font-medium mt-6">Compliance notes</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-400 text-xs">
              <li>Instagram Reels via API: max 1 GB, max 15 minutes, min 3 seconds</li>
              <li>Caption max: 2,200 characters</li>
              <li>Max 30 hashtags (recommended: 3–5 for better reach)</li>
              <li>Only Business/Creator accounts can use the Content Publishing API</li>
              <li>Personal accounts must use the manual/deep-link method</li>
              <li>Meta requires disclosure when using automated publishing tools</li>
            </ul>
          </div>
        </section>

        {/* Common env vars */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Complete Environment Variables Reference</h2>
          <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs font-mono text-gray-300 overflow-auto">
{`# Google / YouTube
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# TikTok Content API (requires app approval)
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# Instagram / Meta Graph API
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_USER_ID=

# Buffer (TikTok + Instagram fallback)
BUFFER_ACCESS_TOKEN=

# Core app
NEXT_PUBLIC_APP_URL=https://clipspark-tau.vercel.app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Payments
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
POSTHOG_PERSONAL_API_KEY=
POSTHOG_PROJECT_ID=

# Email
AGENTMAIL_API_KEY=

# Ops
CRON_SECRET=
ADMIN_SECRET=`}
          </pre>
        </section>

        <div className="pt-4 border-t border-gray-800 text-xs text-gray-600 flex gap-4">
          <Link href="/help" className="hover:text-gray-400">← Help center</Link>
          <Link href="/settings" className="hover:text-gray-400">Settings →</Link>
          <Link href="/partners" className="hover:text-gray-400">Import partners →</Link>
        </div>
      </main>
    </div>
  )
}
