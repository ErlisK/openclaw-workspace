'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const TRADES = [
  { slug: 'electrician', label: 'Electrician', emoji: '⚡' },
  { slug: 'plumber', label: 'Plumber', emoji: '🔧' },
  { slug: 'hvac-technician', label: 'HVAC Technician', emoji: '❄️' },
  { slug: 'welder', label: 'Welder', emoji: '🔥' },
  { slug: 'pipefitter', label: 'Pipefitter', emoji: '🔩' },
]

const REGIONS = [
  { code: 'US-TX', label: 'Texas', flag: '🤠', standard: 'NEC 2020 + TDLR' },
  { code: 'US-CA', label: 'California', flag: '🌴', standard: 'CEC 2022 + Title 24' },
  { code: 'US-IL', label: 'Illinois', flag: '🌽', standard: 'NEC 2020 + Chicago Code' },
  { code: 'US-NY', label: 'New York', flag: '🗽', standard: 'NYC Electrical Code' },
  { code: 'US-FL', label: 'Florida', flag: '☀️', standard: 'NEC 2020 + FBC' },
]

const SKILL_SUGGESTIONS: Record<string, string[]> = {
  electrician: ['Panel upgrade — 200A residential NEC 230', '3-phase motor wiring NEC 430', 'Arc fault breaker install NEC 210.12', 'Conduit bending — EMT 3-bend saddle', 'GFCI circuit NEC 210.8', 'Solar PV rapid shutdown NEC 690.12'],
  plumber: ['Gas pressure test IRC G2417', 'Copper sweat joint potable water', 'P-trap and trap arm install IPC 909', 'CSST bonding IRC G2411', 'Drain slope 1/4 per foot', 'Water heater replacement'],
  'hvac-technician': ['R-410A refrigerant recovery EPA 608', 'Subcooling charge verification', 'Duct leakage test ASHRAE 90.1 §6.4', 'Economizer commissioning ASHRAE 90.1', 'Capacitor replacement lockout/tagout', 'VAV actuator calibration'],
  welder: ['6G pipe weld qualification ASME IX', 'Structural fillet weld AWS D1.1 3G', 'TIG weld 316L stainless ASME IX', 'WPS review and qualification', 'Weld visual inspection AWS D1.1 Table 6.1', 'FCAW structural welding'],
  pipefitter: ['Flanged joint assembly ASME B31.3', 'Socket weld gap requirement B31.3 §311.2', 'Hydrostatic pressure test ASME B31.3', 'Steam trap inspection', 'Pipe support spacing ASME B31.1', 'PRV replacement API 520'],
}

type Slot = { id: string; slot_start: string; slot_end: string; timezone: string }
type MentorSlots = { mentor: { id: string; full_name: string; bio: string; years_experience: number }; slots: Slot[] }

function formatTime(iso: string, tz?: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz || 'America/Chicago' })
  } catch { return iso.slice(11, 16) }
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function VerifyPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Steps: trade → region → skill → calendar → confirm → done
  const [step, setStep] = useState<'trade' | 'region' | 'skill' | 'calendar' | 'confirm' | 'done'>('trade')

  // Selections
  const [tradeSlug, setTradeSlug] = useState('')
  const [tradeId, setTradeId] = useState<string | null>(null)
  const [regionCode, setRegionCode] = useState('')
  const [regionId, setRegionId] = useState<string | null>(null)
  const [skill, setSkill] = useState('')
  const [employerName, setEmployerName] = useState('')
  const [employerEmail, setEmployerEmail] = useState('')
  const [employerCompany, setEmployerCompany] = useState('')
  const [timezone, setTimezone] = useState('America/Chicago')

  // Calendar
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [weekOffset, setWeekOffset] = useState(0)
  const [mentorSlots, setMentorSlots] = useState<MentorSlots[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [selectedMentor, setSelectedMentor] = useState<MentorSlots['mentor'] | null>(null)

  // Booking result
  const [booking, setBooking] = useState<any>(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')

  // Resolve trade_id from slug
  useEffect(() => {
    if (!tradeSlug) { setTradeId(null); return }
    fetch(`/api/admin`)  // use supabase directly via client
      .then(() => {
        // Inline fetch trade by slug
        fetch(`/api/challenge-prompt?trade_id=placeholder`)  // just to warm
          .catch(() => {})
      })
    // Use REST directly
    const srk = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (srk && base) {
      fetch(`${base}/rest/v1/trades?slug=eq.${tradeSlug}&select=id`, {
        headers: { apikey: srk, Authorization: `Bearer ${srk}` }
      }).then(r => r.json()).then(d => { if (d[0]?.id) setTradeId(d[0].id) })
    }
  }, [tradeSlug])

  // Resolve region_id
  useEffect(() => {
    if (!regionCode) { setRegionId(null); return }
    const srk = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (srk && base) {
      fetch(`${base}/rest/v1/regions?region_code=eq.${regionCode}&select=id`, {
        headers: { apikey: srk, Authorization: `Bearer ${srk}` }
      }).then(r => r.json()).then(d => { if (d[0]?.id) setRegionId(d[0].id) })
    }
  }, [regionCode])

  // Load slots when date selected
  useEffect(() => {
    if (!selectedDate) return
    setSlotsLoading(true)
    setSelectedSlot(null)
    setSelectedMentor(null)
    fetch(`/api/schedule?date=${selectedDate}${tradeId ? `&trade_id=${tradeId}` : ''}`)
      .then(r => r.json())
      .then(d => { setMentorSlots(d.mentors || []); setSlotsLoading(false) })
      .catch(() => setSlotsLoading(false))
  }, [selectedDate, tradeId])

  // Build week days
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekDays = []
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, weekOffset * 7 + i)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    weekDays.push(d)
  }

  const handleBook = async () => {
    if (!selectedSlot || !skill || !employerEmail) return
    setBookingLoading(true)
    setBookingError('')
    const tradeInfo = TRADES.find(t => t.slug === tradeSlug)
    const regionInfo = REGIONS.find(r => r.code === regionCode)
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: selectedSlot.id,
        trade_id: tradeId,
        region_id: regionId,
        skill_to_demonstrate: skill,
        code_standards: regionInfo ? [regionInfo.standard] : [],
        commissioned_by_type: 'employer',
        price_charged: 7500,
        timezone: selectedSlot.timezone || timezone,
        // In real app, pass authenticated user IDs
      }),
    })
    const data = await res.json()
    if (!res.ok) { setBookingError(data.error || 'Booking failed'); setBookingLoading(false); return }
    setBooking(data)
    setStep('done')
    setBookingLoading(false)
  }

  const tradeInfo = TRADES.find(t => t.slug === tradeSlug)
  const regionInfo = REGIONS.find(r => r.code === regionCode)

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (step === 'done' && booking) {
    const sessionTime = new Date(booking.scheduled_at)
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">✅</div>
            <h1 className="text-2xl font-bold text-gray-900">Verification Booked!</h1>
            <p className="text-gray-500 mt-1">Your live skill verification is confirmed.</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-gray-500">Date & Time</span>
              <span className="font-semibold text-gray-900">{sessionTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {sessionTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Duration</span>
              <span className="font-semibold text-gray-900">15 minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Skill</span>
              <span className="font-semibold text-gray-900 text-right max-w-[60%]">{skill.slice(0, 50)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Trade</span>
              <span className="font-semibold">{tradeInfo?.emoji} {tradeInfo?.label}</span>
            </div>
            {regionInfo && <div className="flex justify-between">
              <span className="text-gray-500">Jurisdiction</span>
              <span className="font-semibold">{regionInfo.flag} {regionInfo.label}</span>
            </div>}
            <div className="flex justify-between">
              <span className="text-gray-500">Fee</span>
              <span className="font-semibold text-green-700">$75.00</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <div className="font-semibold text-blue-900 text-sm mb-2">🔗 Video Call Link</div>
            <div className="font-mono text-blue-700 text-sm break-all">{booking.meeting_link}</div>
            <p className="text-blue-600 text-xs mt-1.5">Your mentor and tradesperson will join at this link at the scheduled time.</p>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 mb-6 text-sm text-amber-800">
            <div className="font-semibold mb-1">📧 What's next:</div>
            <ul className="space-y-1 text-amber-700">
              <li>• Confirmation email sent to {employerEmail}</li>
              <li>• Mentor and tradesperson notified</li>
              <li>• Calendar invite (.ics) will arrive within 5 minutes</li>
              <li>• You'll receive an outcome report within 24h of the session</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a href="/search" className="bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm text-center hover:bg-blue-700">
              Search Portfolios
            </a>
            <button onClick={() => { setStep('trade'); setSkill(''); setSelectedSlot(null); setBooking(null); }}
              className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-200">
              Book Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Book Live Verification</h1>
          <p className="text-gray-500 mt-1 text-sm">15-minute live skill check · Vetted journeyman mentor · $75</p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 items-center justify-center mb-6 flex-wrap">
          {['Trade', 'Region', 'Skill', 'Calendar', 'Confirm'].map((s, i) => {
            const stepIdx = ['trade','region','skill','calendar','confirm'].indexOf(step)
            return (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${stepIdx > i ? 'bg-green-500 text-white' : stepIdx === i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {stepIdx > i ? '✓' : i + 1}
                </div>
                <span className={`text-xs ${stepIdx === i ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{s}</span>
                {i < 4 && <div className="w-4 h-0.5 bg-gray-200" />}
              </div>
            )
          })}
        </div>

        {bookingError && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{bookingError}</div>}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* ── Step: Trade ── */}
          {step === 'trade' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Which trade?</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TRADES.map(t => (
                  <button key={t.slug} onClick={() => { setTradeSlug(t.slug); setStep('region') }}
                    className="p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-center">
                    <div className="text-2xl mb-1">{t.emoji}</div>
                    <div className="text-sm font-medium text-gray-800">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Region ── */}
          {step === 'region' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Which jurisdiction?</h2>
              <p className="text-gray-500 text-sm mb-4">{tradeInfo?.emoji} {tradeInfo?.label} · Select the region the work will be performed in</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {REGIONS.map(r => (
                  <button key={r.code} onClick={() => { setRegionCode(r.code); setStep('skill') }}
                    className="p-4 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{r.flag}</span>
                      <span className="font-semibold text-gray-900">{r.label}</span>
                    </div>
                    <div className="text-xs text-gray-400">{r.standard}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('trade')} className="mt-4 text-sm text-gray-400 hover:text-gray-600">← Back</button>
            </div>
          )}

          {/* ── Step: Skill ── */}
          {step === 'skill' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">What skill to verify?</h2>
              <p className="text-gray-500 text-sm mb-4">{tradeInfo?.emoji} {tradeInfo?.label} · {regionInfo?.flag} {regionInfo?.label} · {regionInfo?.standard}</p>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Specific skill or task *</label>
                <textarea value={skill} onChange={e => setSkill(e.target.value)} rows={3}
                  placeholder="Describe the specific skill, task, or code section to verify…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {SKILL_SUGGESTIONS[tradeSlug]?.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-2">Quick-fill common skills:</div>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_SUGGESTIONS[tradeSlug].map(s => (
                      <button key={s} onClick={() => setSkill(s)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-600 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your name *</label>
                  <input value={employerName} onChange={e => setEmployerName(e.target.value)} placeholder="Jane Smith"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input value={employerEmail} onChange={e => setEmployerEmail(e.target.value)} type="email" placeholder="you@company.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input value={employerCompany} onChange={e => setEmployerCompany(e.target.value)} placeholder="Acme Electric"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setStep('region')} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200">← Back</button>
                <button onClick={() => setStep('calendar')} disabled={!skill || !employerEmail}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
                  Select Time →
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Calendar ── */}
          {step === 'calendar' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Pick a date & time</h2>

              {/* Week navigation */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => { if (weekOffset > 0) setWeekOffset(w => w - 1) }} disabled={weekOffset === 0}
                  className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30">← Prev week</button>
                <span className="text-sm text-gray-600 font-medium">
                  {weekDays[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekDays[weekDays.length - 1]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <button onClick={() => setWeekOffset(w => w + 1)} className="text-sm text-gray-500 hover:text-gray-800">Next week →</button>
              </div>

              {/* Date strip */}
              <div className="grid grid-cols-5 gap-1.5 mb-4">
                {weekDays.map(d => {
                  const dk = dateKey(d)
                  return (
                    <button key={dk} onClick={() => setSelectedDate(dk)}
                      className={`p-2 rounded-xl text-center transition-colors ${selectedDate === dk ? 'bg-blue-600 text-white' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}`}>
                      <div className={`text-xs ${selectedDate === dk ? 'text-blue-100' : 'text-gray-500'}`}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className={`text-lg font-bold ${selectedDate === dk ? 'text-white' : 'text-gray-900'}`}>{d.getDate()}</div>
                    </button>
                  )
                })}
              </div>

              {/* Time slots */}
              {selectedDate && (
                slotsLoading ? (
                  <div className="text-center text-gray-400 py-8 animate-pulse">Loading availability…</div>
                ) : mentorSlots.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-xl">
                    No available slots on this day. Try another date.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mentorSlots.map(ms => (
                      <div key={ms.mentor.id} className="border border-gray-200 rounded-xl p-3">
                        <div className="font-medium text-gray-900 text-sm mb-2">{ms.mentor.full_name}</div>
                        <div className="text-xs text-gray-400 mb-2">{ms.mentor.years_experience} years exp{ms.mentor.bio ? ` · ${ms.mentor.bio.slice(0, 50)}` : ''}</div>
                        <div className="flex flex-wrap gap-2">
                          {ms.slots.map(slot => (
                            <button key={slot.id}
                              onClick={() => { setSelectedSlot(slot); setSelectedMentor(ms.mentor) }}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-colors ${selectedSlot?.id === slot.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 text-gray-700'}`}>
                              {formatTime(slot.slot_start, slot.timezone)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {selectedSlot && selectedMentor && (
                <div className="mt-4 bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
                  Selected: <strong>{selectedMentor.full_name}</strong> at {formatTime(selectedSlot.slot_start, selectedSlot.timezone)} — 15 min · $75
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button onClick={() => setStep('skill')} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200">← Back</button>
                <button onClick={() => setStep('confirm')} disabled={!selectedSlot}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40">
                  Review Booking →
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Confirm ── */}
          {step === 'confirm' && selectedSlot && selectedMentor && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Confirm Booking</h2>

              <div className="space-y-2 text-sm mb-5">
                {[
                  ['Trade', `${tradeInfo?.emoji} ${tradeInfo?.label}`],
                  ['Jurisdiction', `${regionInfo?.flag} ${regionInfo?.label} · ${regionInfo?.standard}`],
                  ['Skill', skill],
                  ['Mentor', selectedMentor.full_name],
                  ['Date', new Date(selectedSlot.slot_start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })],
                  ['Time', `${formatTime(selectedSlot.slot_start, selectedSlot.timezone)} (${selectedSlot.timezone})`],
                  ['Duration', '15 minutes'],
                  ['Your Name', employerName],
                  ['Your Email', employerEmail],
                  ...(employerCompany ? [['Company', employerCompany]] : []),
                  ['Fee', '$75.00'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-gray-100 pb-1.5">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-900 text-right max-w-[55%]">{v}</span>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800 mb-5">
                <div className="font-semibold mb-1">What happens at the session:</div>
                <ul className="space-y-1 text-blue-700 text-xs">
                  <li>• Mentor joins video call at the scheduled time</li>
                  <li>• Tradesperson demonstrates the requested skill live</li>
                  <li>• Mentor provides real-time code compliance feedback</li>
                  <li>• Signed outcome report delivered within 24h</li>
                  <li>• Pass result → jurisdiction-tagged badge issued to wallet</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-5">
                🔐 By confirming, you agree to CertClip's verification terms. The meeting link will be provided immediately after booking and sent to {employerEmail}.
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('calendar')} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200">← Back</button>
                <button onClick={handleBook} disabled={bookingLoading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40">
                  {bookingLoading ? 'Booking…' : '🔒 Confirm & Book ($75)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 animate-pulse">Loading…</div>}>
      <VerifyPageInner />
    </Suspense>
  )
}
