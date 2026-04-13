'use client'
import { useState } from 'react'

interface RetentionSettings {
  testerPiiDays: number
  feedbackDays: number
  eventsDays: number
  anonymizeNotDelete: boolean
  notifyBeforeCleanup: boolean
  lastCleanupAt: string | null
}

const PRESET_OPTIONS = [
  { label: '90 days', value: 90 },
  { label: '1 year',  value: 365 },
  { label: '2 years', value: 730 },
  { label: 'Never',   value: 3650 },
]

export default function RetentionControls({ initial }: { initial: RetentionSettings }) {
  const [settings, setSettings] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [saved, setSaved] = useState(false)
  const [applyResult, setApplyResult] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/privacy/retention', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  async function handleApplyNow() {
    setApplying(true)
    setApplyResult(null)
    const res = await fetch('/api/privacy/retention', { method: 'POST' })
    const data = await res.json()
    setApplyResult(data.message ?? 'Done')
    setApplying(false)
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Tester PII */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">
            Tester PII (emails, names)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_OPTIONS.map(o => (
              <button key={o.value}
                onClick={() => setSettings(s => ({ ...s, testerPiiDays: o.value }))}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  settings.testerPiiDays === o.value
                    ? 'bg-[#ff6600]/20 border-[#ff6600]/40 text-[#ff6600]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/8'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-600 mt-1.5">
            {settings.testerPiiDays === 3650 ? 'Retain indefinitely' : `Delete after ${settings.testerPiiDays} days`}
          </div>
        </div>

        {/* Feedback */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">
            Session Feedback
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_OPTIONS.filter(o => o.value >= 90).map(o => (
              <button key={o.value}
                onClick={() => setSettings(s => ({ ...s, feedbackDays: o.value }))}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  settings.feedbackDays === o.value
                    ? 'bg-[#ff6600]/20 border-[#ff6600]/40 text-[#ff6600]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/8'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-600 mt-1.5">
            {settings.feedbackDays === 3650 ? 'Retain indefinitely' : `Delete after ${settings.feedbackDays} days`}
          </div>
        </div>

        {/* Events */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">
            Analytics Events
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_OPTIONS.filter(o => o.value >= 90).map(o => (
              <button key={o.value}
                onClick={() => setSettings(s => ({ ...s, eventsDays: o.value }))}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  settings.eventsDays === o.value
                    ? 'bg-[#ff6600]/20 border-[#ff6600]/40 text-[#ff6600]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/8'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-600 mt-1.5">
            {settings.eventsDays === 3650 ? 'Retain indefinitely' : `Delete after ${settings.eventsDays} days`}
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-4 pt-1 border-t border-white/8">
        {[
          { key: 'anonymizeNotDelete' as const, label: 'Anonymize instead of hard-delete', desc: 'Preserves session analytics integrity while removing PII' },
          { key: 'notifyBeforeCleanup' as const, label: 'Email me before automatic cleanup', desc: 'Receive a reminder 7 days before the cron job runs' },
        ].map(opt => (
          <label key={opt.key} className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings[opt.key]}
              onChange={e => setSettings(s => ({ ...s, [opt.key]: e.target.checked }))}
              className="mt-0.5 accent-[#ff6600]"
            />
            <div>
              <div className="text-xs font-medium text-gray-300">{opt.label}</div>
              <div className="text-xs text-gray-600">{opt.desc}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap pt-2">
        <button onClick={handleSave} disabled={saving}
          className="bg-[#ff6600] hover:bg-[#e55a00] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
        </button>
        <button onClick={handleApplyNow} disabled={applying}
          className="bg-white/8 hover:bg-white/12 border border-white/10 text-gray-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          {applying ? 'Running…' : 'Apply Now'}
        </button>
        {settings.lastCleanupAt && (
          <span className="text-xs text-gray-600">
            Last cleanup: {new Date(settings.lastCleanupAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </div>

      {applyResult && (
        <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          {applyResult}
        </div>
      )}
    </div>
  )
}
