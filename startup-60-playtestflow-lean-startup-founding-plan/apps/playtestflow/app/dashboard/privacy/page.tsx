import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getRetentionSettings } from '@/lib/privacy'
import RetentionControls from './RetentionControls'
import DataExportButton from './DataExportButton'
import DeleteAccountButton from './DeleteAccountButton'

export const dynamic = 'force-dynamic'

export default async function PrivacyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const svc = createServiceClient()
  const [retentionSettings, privacyRequests, consentTemplates] = await Promise.all([
    getRetentionSettings(user.id),
    svc.from('privacy_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false })
      .limit(10),
    svc.from('consent_templates')
      .select('id, name, version, kind, title, gdpr_compliant, ccpa_compliant, is_default, created_at')
      .or(`owner_id.eq.${user.id},owner_id.is.null`)
      .order('is_default', { ascending: false }),
  ])

  const requests = privacyRequests.data ?? []
  const templates = consentTemplates.data ?? []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>🔒</span> Privacy & Data Controls
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          GDPR / CCPA self-serve tools — access, export, or delete your data at any time.
        </p>
      </div>

      {/* Compliance badges */}
      <div className="flex flex-wrap gap-2">
        {['GDPR Art. 15–22', 'CCPA §1798', 'Privacy by Design', 'Data Minimization'].map(b => (
          <span key={b} className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full font-medium">
            ✓ {b}
          </span>
        ))}
      </div>

      {/* Data export & deletion */}
      <div className="grid sm:grid-cols-2 gap-5">
        {/* Export */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="text-xl mb-2">📦</div>
          <h2 className="font-semibold text-white mb-1">Export Your Data</h2>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            Download a complete copy of all your personal data stored in PlaytestFlow —
            sessions, feedback, consents, billing history, and more. (GDPR Art. 15 &amp; 20, CCPA §1798.100)
          </p>
          <DataExportButton />
          <p className="text-xs text-gray-600 mt-2">JSON format · Limit: 1 export per 24 hours</p>
        </div>

        {/* Delete */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="text-xl mb-2">🗑️</div>
          <h2 className="font-semibold text-white mb-1">Delete Your Account</h2>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            Permanently anonymize and delete your personal data. Your account will be closed
            and PII removed from all tables. This cannot be undone. (GDPR Art. 17, CCPA §1798.105)
          </p>
          <DeleteAccountButton />
          <p className="text-xs text-gray-600 mt-2">Irreversible · Anonymous session data may be retained</p>
        </div>
      </div>

      {/* Retention controls */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="font-semibold mb-1">Data Retention Policy</h2>
        <p className="text-sm text-gray-400 mb-5 leading-relaxed">
          Control how long PlaytestFlow retains tester PII, session feedback, and analytics events on your behalf.
          Data older than your configured threshold is automatically anonymized during nightly cleanup.
        </p>
        <RetentionControls initial={retentionSettings} />
      </div>

      {/* Consent templates */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Consent Templates</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Versioned consent forms attached to your playtest sessions (GDPR Art. 13)
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{t.name}</span>
                  {t.is_default && (
                    <span className="text-xs bg-[#ff6600]/15 text-[#ff6600] px-2 py-0.5 rounded-full font-medium">System</span>
                  )}
                  <span className="text-xs text-gray-600">v{t.version}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{t.title}</div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {t.gdpr_compliant && (
                  <span className="text-xs text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">GDPR</span>
                )}
                {t.ccpa_compliant && (
                  <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">CCPA</span>
                )}
                <span className="text-xs text-gray-600 bg-white/5 px-1.5 py-0.5 rounded capitalize">{t.kind}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy request history */}
      {requests.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Request History</h2>
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 text-sm">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  r.status === 'completed' ? 'bg-green-400' :
                  r.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                }`} />
                <div className="flex-1">
                  <span className="capitalize text-gray-300">{r.request_type}</span>
                  <span className="text-gray-600 ml-2 text-xs uppercase">{r.regulation}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(r.requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className={`text-xs font-medium ${
                  r.status === 'completed' ? 'text-green-400' :
                  r.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                }`}>{r.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal footer */}
      <div className="text-xs text-gray-600 leading-relaxed border-t border-white/5 pt-4 space-y-1">
        <p>
          <strong className="text-gray-500">Data Controller:</strong> PlaytestFlow (scide-founder@agentmail.to)
        </p>
        <p>
          <strong className="text-gray-500">Legal basis for processing:</strong> Consent (Art. 6(1)(a) GDPR) for session participation;
          Legitimate interest (Art. 6(1)(f)) for platform analytics; Contract (Art. 6(1)(b)) for subscription services.
        </p>
        <p>
          <strong className="text-gray-500">Data retention:</strong> Tester PII: 365 days (configurable) ·
          Session feedback: 730 days (configurable) · Billing records: 7 years (legal obligation)
        </p>
        <p>
          To exercise rights not available above, email <span className="text-gray-400">privacy@playtestflow.com</span>.
          Response within 30 days as required by GDPR Art. 12.
        </p>
      </div>
    </div>
  )
}
