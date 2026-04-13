'use client'
import { useState, useEffect } from 'react'
import posthog from 'posthog-js'
import {
  trackProCtaClick,
  trackProSignup,
  trackProProfileComplete,
  getDistinctId,
} from '@/lib/analytics'

const SPECIALTIES = ['Permit Expediter', 'Plan Drafter / Designer', 'Code Consultant', 'Structural Engineer']

type Step = 'form' | 'license' | 'done'

export default function ProPage() {
  const [step, setStep] = useState<Step>('form')
  const [proId, setProId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', email: '', license_number: '', specialty: 'Permit Expediter',
    zip: '', service_radius: '25',
  })
  const [licenseFile, setLicenseFile]   = useState<File | null>(null)
  const [licenseState, setLicenseState] = useState('TX')
  const [licenseExpiry, setLicenseExpiry] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    posthog.capture('lp_view', { page: 'pro_landing', metro: 'Austin' })
  }, [])

  const handleChange = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  // Step 1: Basic info → create pro record
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    trackProSignup({ specialty: form.specialty, zip: form.zip })

    try {
      const res = await fetch('/api/pro-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form, city: 'Austin',
          posthog_distinct_id: getDistinctId(),
          status: 'pending',
          license_status: 'not_submitted',
        }),
      })
      const data = await res.json()
      if (data.id) setProId(data.id)
      setStep('license')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: License upload
  const handleLicenseUpload = async () => {
    if (!licenseFile || !proId) return
    setUploading(true)
    setUploadError('')

    const fd = new FormData()
    fd.append('pro_id', proId)
    fd.append('pro_email', form.email)
    fd.append('file', licenseFile)
    fd.append('license_number', form.license_number)
    fd.append('license_state', licenseState)
    if (licenseExpiry) fd.append('license_expiry', licenseExpiry)

    try {
      const res = await fetch('/api/pro/license-upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setUploadError(data.error ?? 'Upload failed')
        return
      }
      trackProProfileComplete({ specialty: form.specialty, zip: form.zip })
      setStep('done')
    } catch {
      setUploadError('Upload failed — please try again')
    } finally {
      setUploading(false)
    }
  }

  const handleSkipUpload = async () => {
    // Allow skip; pro will be reminded to upload
    trackProProfileComplete({ specialty: form.specialty, zip: form.zip })
    setStep('done')
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) setLicenseFile(f)
  }

  return (
    <main className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <a href="/" className="font-bold text-xl text-blue-700">ExpediteHub</a>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Pro Network · Austin, TX</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* ── Step: Done ── */}
        {step === 'done' && (
          <div className="text-center">
            <div className="text-5xl mb-4">🙌</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Application Received!</h1>
            <p className="text-gray-500 mb-2">
              We&apos;ll verify your license and reach out within 2 business days.
            </p>
            <p className="text-gray-400 text-sm mb-8">
              Once verified, you&apos;ll be notified and can log in to start quoting projects.
            </p>
            <div className="bg-blue-50 rounded-2xl p-5 text-left text-sm text-blue-800 mb-6 max-w-sm mx-auto">
              <p className="font-semibold mb-2">What happens next:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Admin reviews your license document (1–2 business days)</li>
                <li>You receive an approval email with portal access</li>
                <li>Start quoting pre-qualified Austin homeowners</li>
              </ol>
            </div>
            <a href="/" className="text-blue-600 hover:underline text-sm">← Back to ExpediteHub</a>
          </div>
        )}

        {/* ── Step: License Upload ── */}
        {step === 'license' && (
          <div>
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8 text-sm">
              <div className="flex items-center gap-1.5 text-green-600 font-medium">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs">✓</div>
                <span>Profile</span>
              </div>
              <div className="flex-1 h-px bg-blue-300 mx-1" />
              <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                <span>License</span>
              </div>
              <div className="flex-1 h-px bg-gray-200 mx-1" />
              <div className="flex items-center gap-1.5 text-gray-400">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">3</div>
                <span>Done</span>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your License</h2>
            <p className="text-gray-500 text-sm mb-6">
              Upload a clear photo or PDF of your current Texas permit expediter license.
              Accepted: JPEG, PNG, WebP, PDF (max 10 MB).
            </p>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-5 ${
                dragOver ? 'border-blue-400 bg-blue-50' :
                licenseFile ? 'border-green-400 bg-green-50' :
                'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
              onClick={() => document.getElementById('license-file-input')?.click()}
            >
              <input
                id="license-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => setLicenseFile(e.target.files?.[0] ?? null)}
              />
              {licenseFile ? (
                <div>
                  <div className="text-4xl mb-2">📄</div>
                  <p className="font-semibold text-green-700">{licenseFile.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{(licenseFile.size / 1024).toFixed(0)} KB · Click to change</p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-3">📤</div>
                  <p className="font-semibold text-gray-700">Drag & drop or click to upload</p>
                  <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP or PDF · max 10 MB</p>
                </div>
              )}
            </div>

            {/* License metadata */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License State</label>
                <select value={licenseState} onChange={e => setLicenseState(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="TX">TX — Texas</option>
                  <option value="Other">Other (specify in notes)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry (optional)</label>
                <input type="date" value={licenseExpiry} onChange={e => setLicenseExpiry(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4">
                {uploadError}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleSkipUpload}
                className="px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Skip for now
              </button>
              <button
                onClick={handleLicenseUpload}
                disabled={uploading || !licenseFile}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all"
              >
                {uploading ? 'Uploading…' : '📤 Upload License Document'}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-3">
              Your document is stored securely and only visible to ExpediteHub admins.
            </p>
          </div>
        )}

        {/* ── Step: Basic Info Form ── */}
        {step === 'form' && (
          <>
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8 text-sm">
              <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                <span>Profile</span>
              </div>
              <div className="flex-1 h-px bg-gray-200 mx-1" />
              <div className="flex items-center gap-1.5 text-gray-400">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">2</div>
                <span>License</span>
              </div>
              <div className="flex-1 h-px bg-gray-200 mx-1" />
              <div className="flex items-center gap-1.5 text-gray-400">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">3</div>
                <span>Done</span>
              </div>
            </div>

            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-3 py-1 rounded-full mb-4">
                🔧 For Permit Professionals
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Join the ExpediteHub Pro Network</h1>
              <p className="text-gray-500 text-lg">
                Get matched with pre-qualified Austin homeowners. No cold calls. Pre-filled forms mean faster quotes.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-10 text-center">
              {[
                { icon: '📋', label: 'Pre-filled permit forms' },
                { icon: '🏠', label: 'Qualified leads' },
                { icon: '💰', label: 'Escrow payments' },
              ].map(({ icon, label }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-4">
                  <div className="text-2xl mb-2">{icon}</div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 bg-gray-50 rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 1 — Your Profile</h2>

              {[
                { label: 'Full Name',         key: 'name',           type: 'text',  placeholder: 'Jane Smith' },
                { label: 'Business Email',    key: 'email',          type: 'email', placeholder: 'jane@permitpro.com' },
                { label: 'TX License Number', key: 'license_number', type: 'text',  placeholder: 'e.g. TDLR-12345' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} required placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                <select value={form.specialty} onChange={(e) => handleChange('specialty', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your ZIP Code</label>
                  <input type="text" required placeholder="78701" maxLength={5} pattern="\d{5}"
                    value={form.zip} onChange={(e) => handleChange('zip', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Radius</label>
                  <select value={form.service_radius} onChange={(e) => handleChange('service_radius', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="5">5 miles</option>
                    <option value="10">10 miles</option>
                    <option value="25">25 miles (all Austin)</option>
                    <option value="50">50+ miles</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all">
                {loading ? 'Saving…' : 'Next: Upload License →'}
              </button>
              <p className="text-xs text-gray-400 text-center">
                License verification required · Austin area · Free to apply
              </p>
            </form>

            <div className="text-center mt-6">
              <p className="text-sm text-gray-400">
                Already applied?{' '}
                <a href="/pro/login" className="text-blue-600 hover:underline"
                  onClick={() => trackProCtaClick({ source: 'pro_page_login_link' })}>
                  Sign in to your pro account →
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
