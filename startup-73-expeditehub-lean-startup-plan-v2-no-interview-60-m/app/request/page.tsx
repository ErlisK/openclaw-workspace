'use client'
import { useState, useEffect, useCallback } from 'react'
import posthog from 'posthog-js'
import { gtagConversion } from '@/lib/analytics'
import Link from 'next/link'

const ADU_TYPES = [
  'Detached ADU (backyard cottage)',
  'Attached ADU (addition)',
  'Garage conversion / DADU',
  'Junior ADU (internal conversion)',
]

const TIMELINES = [
  'ASAP — within 30 days',
  '1–3 months',
  '3–6 months',
  'Just planning ahead',
]

interface GisResult {
  lat: number | null
  lng: number | null
  zip: string | null
  zoning: string | null
  zoning_description: string | null
  adu_eligible: boolean | null
  max_adu_sqft: number | null
  adu_notes: string | null
  lot_size_sqft: number | null
  year_built: number | null
  existing_sqft: number | null
}

type Step = 'address' | 'details' | 'uploads' | 'confirm' | 'submitted'

export default function RequestPage() {
  const [step, setStep]           = useState<Step>('address')
  const [email, setEmail]         = useState('')
  const [address, setAddress]     = useState('')
  const [gis, setGis]             = useState<GisResult | null>(null)
  const [gisLoading, setGisLoading] = useState(false)
  const [gisError, setGisError]   = useState('')

  // Details step
  const [aduType, setAduType]     = useState(ADU_TYPES[0])
  const [aduSqft, setAduSqft]     = useState('')
  const [hasPlans, setHasPlans]   = useState<'yes_full' | 'yes_partial' | 'no' | ''>('')
  const [timeline, setTimeline]   = useState(TIMELINES[0])
  const [notes, setNotes]         = useState('')
  const [existingSqft, setExistingSqft] = useState('')
  const [hardSurfaceSqft, setHardSurfaceSqft] = useState('')
  const [utilityConn, setUtilityConn] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')

  // Upload step
  const [files, setFiles]         = useState<File[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])

  const [consentAI, setConsentAI]     = useState(false)
  const [consentManual, setConsentManual] = useState(false)
  const [consentTos, setConsentTos]     = useState(false)
  const [consentData, setConsentData]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    posthog.capture('request_page_view', { metro: 'Austin' })
    // Pre-fill email from URL param (set after Stripe success)
    const p = new URLSearchParams(window.location.search)
    if (p.get('email')) setEmail(decodeURIComponent(p.get('email')!))
  }, [])

  // ── Step 1: Address lookup ─────────────────────────────────────────────────
  const handleAddressLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address.trim() || !email.trim()) return

    setGisLoading(true)
    setGisError('')
    posthog.capture('address_lookup_started', { metro: 'Austin' })

    try {
      const res = await fetch(
        `/api/parcel?address=${encodeURIComponent(address)}`,
      )
      const data = await res.json()
      if (data.error) {
        setGisError('Could not look up parcel data. You can still continue.')
      }
      setGis(data)
      setStep('details')
      posthog.capture('address_lookup_complete', {
        has_zoning: !!data.zoning,
        adu_eligible: data.adu_eligible,
        metro: 'Austin',
      })
    } catch {
      setGisError('Lookup failed — you can continue without parcel data.')
      setGis(null)
      setStep('details')
    } finally {
      setGisLoading(false)
    }
  }

  // ── Step 2: Details → create project ──────────────────────────────────────
  const handleDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeowner_email: email,
          address,
          zip: gis?.zip,
          proposed_adu_type: aduType,
          proposed_adu_sqft: aduSqft ? parseInt(aduSqft) : null,
          has_plans: hasPlans === 'yes_full' || hasPlans === 'yes_partial',
          plans_ready: hasPlans || null,
          timeline,
          notes,
          existing_structure_sqft: existingSqft ? parseInt(existingSqft) : null,
          hard_surface_sqft: hardSurfaceSqft ? parseInt(hardSurfaceSqft) : null,
          utility_connection: utilityConn || null,
          owner_phone: ownerPhone || null,
          posthog_distinct_id: (() => { try { return posthog.get_distinct_id() } catch { return '' } })(),
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProjectId(data.project_id)
      posthog.capture('project_created', {
        project_id: data.project_id,
        adu_type: aduType,
        has_plans: hasPlans,
        metro: 'Austin',
      })
      setStep('uploads')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Step 3: File uploads ───────────────────────────────────────────────────
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    setFiles(prev => [...prev, ...selected].slice(0, 10)) // max 10 files
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...dropped].slice(0, 10))
  }, [])

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUploads = async () => {
    if (!projectId) { setStep('confirm'); return }
    if (files.length === 0) { setStep('confirm'); return }

    setUploading(true)
    const urls: string[] = []

    for (const file of files) {
      const fd = new FormData()
      fd.append('project_id', projectId)
      fd.append('file', file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.url) urls.push(data.url)
      } catch {
        // continue — partial upload OK
      }
    }

    setUploadedUrls(urls)
    posthog.capture('files_uploaded', {
      count: urls.length,
      project_id: projectId,
      metro: 'Austin',
    })
    setUploading(false)
    setStep('confirm')
  }

  const allConsentGiven = consentAI && consentManual && consentTos && consentData

  const handleFinalSubmit = async () => {
    if (!allConsentGiven) return
    setSubmitting(true)
    // 1. Log consent (fire-and-forget, non-blocking)
    fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        email,
        items_accepted: ['ai_disclaimer', 'manual_confirmation', 'tos_agree', 'data_use'],
        page_url: window.location.href,
      }),
    }).catch(() => {})

    // 2. Mark project as submitted
    try {
      await fetch(`/api/projects/${projectId}/submit`, { method: 'POST' })
    } catch { /* best effort */ }

    posthog.capture('project_submitted', {
      project_id: projectId,
      files_count: uploadedUrls.length,
      metro: 'Austin',
    })
    gtagConversion('request_intent_submit')
    setStep('submitted')
    setSubmitting(false)
  }

  const formatSqft = (sqft: number | null) =>
    sqft ? `${sqft.toLocaleString()} sq ft` : null

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="font-bold text-xl text-blue-700">ExpediteHub</Link>
        <span className="text-gray-300">›</span>
        <span className="text-gray-600 text-sm">New ADU Request · Austin</span>
      </nav>

      {/* Progress bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {(['address', 'details', 'uploads', 'confirm'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s ? 'bg-blue-600 text-white' :
                  ['address','details','uploads','confirm','submitted'].indexOf(step) > i
                    ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>{i + 1}</div>
                <span className={step === s ? 'text-blue-700 font-medium' : ''}>{
                  ({ address: 'Address', details: 'Details', uploads: 'Plans/Photos', confirm: 'Review' } as Record<string, string>)[s]
                }</span>
                {i < 3 && <div className="w-8 h-px bg-gray-200" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* ── STEP 1: Address ── */}
        {step === 'address' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Where is your property?
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              We&apos;ll look up your parcel details, zoning, and ADU eligibility from Austin&apos;s GIS database.
            </p>

            <form onSubmit={handleAddressLookup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Address <span className="text-gray-400 font-normal">(Austin, TX)</span>
                </label>
                <input
                  type="text" required value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="123 Main St, Austin, TX 78704"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Enter full street address including city and zip</p>
              </div>

              {gisError && (
                <p className="text-amber-600 text-sm bg-amber-50 rounded-lg px-3 py-2">{gisError}</p>
              )}

              <button type="submit" disabled={gisLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                {gisLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Looking up parcel data…
                  </>
                ) : (
                  <>🔍 Look Up Property →</>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2: GIS results + project details ── */}
        {step === 'details' && (
          <div className="space-y-6">
            {/* GIS card */}
            {gis && (
              <div className={`rounded-2xl p-6 border-2 ${
                gis.adu_eligible === true ? 'border-green-200 bg-green-50' :
                gis.adu_eligible === false ? 'border-red-100 bg-red-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">📍 Parcel Details</h2>
                    <p className="text-sm text-gray-500">{address}</p>
                  </div>
                  {gis.adu_eligible !== null && (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      gis.adu_eligible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
                    }`}>
                      {gis.adu_eligible ? '✅ ADU Eligible' : '⚠️ Verify Eligibility'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {gis.zoning && (
                    <div>
                      <p className="text-gray-400 text-xs">Zoning</p>
                      <p className="font-medium text-gray-800">{gis.zoning}</p>
                      {gis.zoning_description && (
                        <p className="text-gray-500 text-xs">{gis.zoning_description}</p>
                      )}
                    </div>
                  )}
                  {gis.lot_size_sqft && (
                    <div>
                      <p className="text-gray-400 text-xs">Lot Size</p>
                      <p className="font-medium text-gray-800">{formatSqft(gis.lot_size_sqft)}</p>
                    </div>
                  )}
                  {gis.existing_sqft && (
                    <div>
                      <p className="text-gray-400 text-xs">Existing Home</p>
                      <p className="font-medium text-gray-800">{formatSqft(gis.existing_sqft)}</p>
                    </div>
                  )}
                  {gis.year_built && (
                    <div>
                      <p className="text-gray-400 text-xs">Year Built</p>
                      <p className="font-medium text-gray-800">{gis.year_built}</p>
                    </div>
                  )}
                  {gis.max_adu_sqft && (
                    <div>
                      <p className="text-gray-400 text-xs">Max ADU Size</p>
                      <p className="font-medium text-gray-800">{formatSqft(gis.max_adu_sqft)}</p>
                    </div>
                  )}
                  {gis.zip && (
                    <div>
                      <p className="text-gray-400 text-xs">ZIP</p>
                      <p className="font-medium text-gray-800">{gis.zip}</p>
                    </div>
                  )}
                </div>
                {gis.adu_notes && (
                  <p className="text-xs text-gray-500 mt-3 border-t border-gray-200 pt-2">
                    📋 {gis.adu_notes}
                  </p>
                )}
              </div>
            )}

            {/* Details form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Project Details</h2>
              <p className="text-gray-500 text-sm mb-6">Tell us about your ADU project.</p>

              <form onSubmit={handleDetails} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ADU Type</label>
                  <select value={aduType} onChange={e => setAduType(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ADU_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desired ADU Size <span className="text-gray-400 font-normal">(sq ft, optional)</span>
                  </label>
                  <input type="number" value={aduSqft} onChange={e => setAduSqft(e.target.value)}
                    placeholder={`e.g. 600${gis?.max_adu_sqft ? ` (max ${gis.max_adu_sqft})` : ''}`}
                    min="100" max={gis?.max_adu_sqft ?? 2000}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Do you have plans / drawings?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'yes_full',    label: '✅ Full plans' },
                      { value: 'yes_partial', label: '📝 Sketches' },
                      { value: 'no',          label: '❌ Not yet' },
                    ].map(({ value, label }) => (
                      <label key={value} className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 cursor-pointer text-sm transition-all ${
                        hasPlans === value ? 'border-blue-500 bg-blue-50 font-medium' : 'border-gray-200 hover:border-blue-300'
                      }`}>
                        <input type="radio" name="has_plans" value={value}
                          checked={hasPlans === value}
                          onChange={() => setHasPlans(value as typeof hasPlans)}
                          className="accent-blue-600" />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                  <select required value={timeline} onChange={e => setTimeline(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Existing home size <span className="text-gray-400 font-normal">(sq ft — helps calculate impervious cover)</span>
                  </label>
                  <input type="number" value={existingSqft} onChange={e => setExistingSqft(e.target.value)}
                    placeholder={gis?.existing_sqft ? `${gis.existing_sqft} (from GIS — confirm or update)` : 'e.g. 1,800'}
                    min="100"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-gray-400 mt-1">Used to verify impervious cover limits for BP-001</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Existing hard surfaces <span className="text-gray-400 font-normal">(driveway + patio sq ft, approx.)</span>
                  </label>
                  <input type="number" value={hardSurfaceSqft} onChange={e => setHardSurfaceSqft(e.target.value)}
                    placeholder="e.g. 400"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Utility connection preference</label>
                  <select value={utilityConn} onChange={e => setUtilityConn(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select…</option>
                    <option value="shared">Shared with main structure</option>
                    <option value="separate">Separate meter requested</option>
                    <option value="tbd">Not sure yet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner phone <span className="text-gray-400 font-normal">(required for permit application)</span>
                  </label>
                  <input type="tel" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)}
                    placeholder="(512) 555-0100"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional notes <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    rows={3} placeholder="e.g. alley access, existing garage, HOA constraints…"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                {submitError && (
                  <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{submitError}</p>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep('address')}
                    className="px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                    ← Back
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all">
                    {submitting ? 'Saving…' : 'Continue →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── STEP 3: File uploads ── */}
        {step === 'uploads' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Upload Plans or Photos <span className="text-gray-400 font-normal text-base">(optional)</span>
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Site photos, sketches, or existing architectural drawings help your expediter prep a more accurate packet.
              Supported: PDF, JPG, PNG, HEIC · Max 10 MB each · Up to 10 files
            </p>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center mb-4 hover:border-blue-300 transition-colors"
            >
              <div className="text-3xl mb-2">📎</div>
              <p className="text-sm text-gray-500 mb-3">Drag & drop files here, or</p>
              <label className="cursor-pointer inline-block bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Browse Files
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"
                  onChange={handleFileSelect} className="hidden" />
              </label>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2 mb-6">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{f.type.includes('pdf') ? '📄' : '🖼️'}</span>
                      <span className="text-gray-700 truncate max-w-xs">{f.name}</span>
                      <span className="text-gray-400">({(f.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button onClick={() => removeFile(i)}
                      className="text-gray-400 hover:text-red-500 text-lg leading-none">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('details')}
                className="px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                ← Back
              </button>
              <button onClick={handleUploads} disabled={uploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Uploading…
                  </>
                ) : files.length > 0 ? `Upload ${files.length} file${files.length > 1 ? 's' : ''} →` : 'Skip for now →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Confirm ── */}
        {step === 'confirm' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Review & Submit</h2>
            <p className="text-gray-500 text-sm mb-6">
              Here&apos;s what your expediter will receive. Submit to get your first quote within 24 hours.
            </p>

            <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-sm mb-6">
              <div className="flex gap-3">
                <span className="text-gray-400 w-32 shrink-0">Email</span>
                <span className="text-gray-800 font-medium">{email}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-400 w-32 shrink-0">Address</span>
                <span className="text-gray-800 font-medium">{address}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-400 w-32 shrink-0">Project Type</span>
                <span className="text-gray-800 font-medium">{aduType}</span>
              </div>
              {aduSqft && (
                <div className="flex gap-3">
                  <span className="text-gray-400 w-32 shrink-0">Desired Size</span>
                  <span className="text-gray-800 font-medium">{aduSqft} sq ft</span>
                </div>
              )}
              <div className="flex gap-3">
                <span className="text-gray-400 w-32 shrink-0">Plans Status</span>
                <span className="text-gray-800 font-medium">
                  {hasPlans === 'yes_full' ? '✅ Full plans' : hasPlans === 'yes_partial' ? '📝 Partial sketches' : '❌ No plans yet'}
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-400 w-32 shrink-0">Timeline</span>
                <span className="text-gray-800 font-medium">{timeline}</span>
              </div>
              {uploadedUrls.length > 0 && (
                <div className="flex gap-3">
                  <span className="text-gray-400 w-32 shrink-0">Files</span>
                  <span className="text-gray-800 font-medium">{uploadedUrls.length} file{uploadedUrls.length > 1 ? 's' : ''} uploaded</span>
                </div>
              )}
              {gis?.zoning && (
                <div className="flex gap-3">
                  <span className="text-gray-400 w-32 shrink-0">Zoning</span>
                  <span className="text-gray-800 font-medium">{gis.zoning} {gis.adu_eligible ? '✅' : '⚠️'}</span>
                </div>
              )}
              {notes && (
                <div className="flex gap-3">
                  <span className="text-gray-400 w-32 shrink-0">Notes</span>
                  <span className="text-gray-800">{notes}</span>
                </div>
              )}
            </div>

            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 mb-6">
              <p className="font-semibold mb-1">What happens after you submit:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Your project is posted to the ExpediteHub pro board</li>
                <li>A licensed Austin expediter reviews and quotes within 24h</li>
                <li>We email you the quote + a preview of your AI-drafted permit packet</li>
                <li>Approve to start — your deposit is held in escrow until delivery</li>
              </ol>
            </div>

            {/* ── Consent checkboxes ── */}
            <div className="border border-amber-200 bg-amber-50 rounded-2xl p-5 mb-6 space-y-4">
              <h3 className="font-semibold text-amber-900 text-sm">⚠️ Required Acknowledgements</h3>

              <label className="flex gap-3 cursor-pointer">
                <input type="checkbox" checked={consentAI} onChange={e => setConsentAI(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600 shrink-0" />
                <span className="text-xs text-gray-700">
                  <strong>AI Disclaimer:</strong> I understand the permit packet is AI-assisted and may
                  contain errors. A licensed expediter will review it, but municipality acceptance is
                  not guaranteed and final accuracy is my responsibility.
                </span>
              </label>

              <label className="flex gap-3 cursor-pointer">
                <input type="checkbox" checked={consentManual} onChange={e => setConsentManual(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600 shrink-0" />
                <span className="text-xs text-gray-700">
                  <strong>Manual Submission:</strong> I understand that municipality submission may
                  require a manual confirmation step by a licensed expediter, and that processing
                  timelines are estimates only.
                </span>
              </label>

              <label className="flex gap-3 cursor-pointer">
                <input type="checkbox" checked={consentData} onChange={e => setConsentData(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600 shrink-0" />
                <span className="text-xs text-gray-700">
                  <strong>Data Sharing:</strong> I consent to sharing my project details with vetted,
                  licensed Austin permit expediters for the purpose of quoting and permit processing.
                </span>
              </label>

              <label className="flex gap-3 cursor-pointer">
                <input type="checkbox" checked={consentTos} onChange={e => setConsentTos(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600 shrink-0" />
                <span className="text-xs text-gray-700">
                  I have read and agree to the{' '}
                  <a href="/tos" target="_blank" className="text-blue-600 hover:underline font-medium">
                    Terms of Service
                  </a>{' '}
                  and Privacy Policy.
                </span>
              </label>

              {!allConsentGiven && (
                <p className="text-xs text-amber-700 font-medium">
                  Please check all boxes above to continue.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('uploads')}
                className="px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                ← Back
              </button>
              <button onClick={handleFinalSubmit} disabled={submitting || !allConsentGiven}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all">
                {submitting ? 'Submitting…' : '🚀 Submit My ADU Request'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Submitted ── */}
        {step === 'submitted' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Request Submitted!</h1>
            <p className="text-gray-500 mb-4">
              Your ADU project is now on the ExpediteHub pro board.
              A licensed Austin expediter will review it and send you a quote within <strong>24 hours</strong>.
            </p>
            <p className="text-gray-400 text-sm mb-6">Project ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{projectId}</code></p>
            <div className="bg-blue-50 rounded-xl p-4 text-left text-sm text-blue-800 mb-6">
              <p className="font-semibold mb-1">Check your email at {email} for:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Quote from your matched expediter</li>
                <li>Preview of your AI-drafted permit packet</li>
                <li>Next steps to approve and start</li>
              </ul>
            </div>
            <Link href="/" className="text-sm text-blue-600 hover:underline">
              ← Back to ExpediteHub
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
