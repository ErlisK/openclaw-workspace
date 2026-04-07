'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Slot = {
  id: string
  mentor_id: string
  slot_start: string
  slot_end: string
  is_booked: boolean
  mentor?: { full_name: string; bio: string; years_experience: number }
}

type Trade = { id: string; name: string; slug: string }
type Region = { id: string; name: string; region_code: string; code_standard: string }
type CodeRef = { id: string; code_standard: string; section: string; title: string }

const tradeEmoji: Record<string, string> = { electrician: '⚡', plumber: '🔧', 'hvac-technician': '❄️', welder: '🔥', pipefitter: '🔩' }

const COMMON_SKILLS: Record<string, string[]> = {
  electrician: [
    'Panel wiring — 3-phase commercial (NEC 2020)',
    'Conduit bending — 4-bend saddle (NEC §358)',
    'GFCI installation — wet location (NEC §210.8)',
    'Service entrance upgrade (NEC §230)',
    'Title 24 lighting controls / occupancy sensor',
    'Solar PV string wiring (NEC §690)',
  ],
  plumber: [
    'PEX-A fitting and pressure test (IPC)',
    'Gas line pressure test (IRC G2417)',
    'Medical gas zone valve (NFPA 99)',
    'Backflow preventer installation',
    'Drain rough-in slope verification',
  ],
  'hvac-technician': [
    'Refrigerant recovery — R-410A (EPA 608)',
    'Mini-split commissioning — superheat/subcooling',
    'VAV box commissioning — BAS integration',
    'Ductwork sealing and pressure test',
  ],
  welder: [
    'Overhead TIG — 2" CS pipe (ASME IX)',
    'Structural fillet weld — AWS D1.1',
    'Pipe fit-up and tack weld (ASME B31.3)',
    'Root pass — 6G position (ASME IX)',
  ],
  pipefitter: [
    'Process pipe fit-up (ASME B31.3)',
    'Flanged joint assembly and torque',
    'Steam fitting and valve installation',
  ],
}

export default function VerifyPage() {
  const [step, setStep] = useState(1)
  const [trades, setTrades] = useState<Trade[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [availableDates, setAvailableDates] = useState<string[]>([])

  const [selectedTrade, setSelectedTrade] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [skillToDemonstrate, setSkillToDemonstrate] = useState('')
  const [customSkill, setCustomSkill] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  const [employerName, setEmployerName] = useState('')
  const [employerEmail, setEmployerEmail] = useState('')
  const [employerCompany, setEmployerCompany] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [booked, setBooked] = useState<{ id: string; time: string; link: string } | null>(null)

  useEffect(() => {
    supabase.from('trades').select('id,name,slug').order('name').then(({ data }) => setTrades(data || []))
    supabase.from('regions').select('id,name,region_code,code_standard').eq('active', true).order('name').then(({ data }) => setRegions(data || []))
  }, [])

  const loadSlots = useCallback(async () => {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('mentor_availability')
      .select(`
        id, mentor_id, slot_start, slot_end, is_booked,
        mentor:profiles!mentor_availability_mentor_id_fkey(full_name, bio, years_experience)
      `)
      .eq('is_booked', false)
      .gte('slot_start', now)
      .order('slot_start')
      .limit(60)

    const s = (data as any) || []
    setSlots(s)
    // Extract unique dates
    const dates = [...new Set(s.map((x: Slot) => x.slot_start.slice(0, 10)))] as string[]
    setAvailableDates(dates)
    if (dates.length > 0 && !selectedDate) setSelectedDate(dates[0])
  }, [selectedDate])

  useEffect(() => { if (step >= 3) loadSlots() }, [step, loadSlots])

  const slotsForDate = slots.filter(s => s.slot_start.slice(0, 10) === selectedDate)

  const formatTime = (iso: string, tz = 'America/Chicago') => {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' })
  }
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const tradeSuggestions = selectedTrade
    ? (COMMON_SKILLS[(trades.find(t => t.id === selectedTrade)?.slug || '')] || [])
    : []

  const handleBook = async () => {
    if (!selectedSlot || !skillToDemonstrate || !employerEmail) {
      setError('Please complete all required fields')
      return
    }
    setLoading(true); setError('')

    const trade = trades.find(t => t.id === selectedTrade)
    const region = regions.find(r => r.id === selectedRegion)

    const res = await fetch('/api/verify/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trade_id: selectedTrade || undefined,
        region_id: selectedRegion || undefined,
        skill_to_demonstrate: customSkill || skillToDemonstrate,
        slot_id: selectedSlot.id,
        employer_name: employerName,
        employer_email: employerEmail,
        employer_company: employerCompany,
        code_standards: region ? [region.code_standard] : [],
        referral_source: 'verify_page',
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }

    setBooked({
      id: data.verification.id,
      time: formatTime(selectedSlot.slot_start),
      link: data.verification.meeting_link,
    })
    setLoading(false)
  }

  if (booked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Live Verification Booked!</h1>
          <p className="text-gray-600 mb-6">Your 10-minute live verification session is confirmed.</p>

          <div className="bg-green-50 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600">📅</span>
              <span className="text-gray-700"><strong>Time:</strong> {booked.time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600">🎯</span>
              <span className="text-gray-700"><strong>Skill:</strong> {customSkill || skillToDemonstrate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600">💰</span>
              <span className="text-gray-700"><strong>Price:</strong> $75 — charged after session</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600">🔗</span>
              <a href={booked.link} className="text-blue-600 underline text-sm truncate">{booked.link}</a>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left text-sm text-blue-800">
            <p className="font-semibold mb-1">What to expect in 10 minutes:</p>
            <ul className="space-y-1">
              <li>• Mentor joins with the tradesperson</li>
              <li>• Tradesperson executes the skill live, responding to the challenge prompt</li>
              <li>• Mentor provides real-time commentary and flags any code issues</li>
              <li>• You observe and can ask up to 2 follow-up questions</li>
              <li>• Badge issued within 1 hour of completion</li>
            </ul>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            After the session, you'll receive a link to rate the perceived value and share feedback.
            Your response helps us improve the product.
          </p>

          <div className="flex gap-3">
            <a href={`/verify/${booked.id}/feedback`} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 text-center text-sm">
              Pre-fill Feedback Form
            </a>
            <a href="/search" className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 text-center text-sm">
              Browse More Portfolios
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-blue-300 text-sm mb-2">
            <a href="/search" className="hover:text-white">← Portfolio Search</a>
          </div>
          <h1 className="text-2xl font-bold">Commission a Live Verification</h1>
          <p className="text-blue-200 mt-1 text-sm">Watch a tradesperson demonstrate a specific skill live, with a journeyman mentor present. 10 minutes. $75.</p>
        </div>
      </div>

      {/* Progress steps */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-0">
          {['Skill & Jurisdiction', 'Your Details', 'Pick a Time', 'Confirm'].map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${step > i + 1 ? 'text-green-600' : step === i + 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold border-2 transition-colors ${
                  step > i + 1 ? 'bg-green-500 border-green-500 text-white' :
                  step === i + 1 ? 'bg-blue-600 border-blue-600 text-white' :
                  'bg-white border-gray-300 text-gray-400'
                }`}>{step > i + 1 ? '✓' : i + 1}</div>
                <span className="hidden md:block">{s}</span>
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 mx-2 ${step > i + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-sm">{error}</div>}

        {/* Step 1: Skill + Jurisdiction */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">What skill do you want verified?</h2>
            <p className="text-gray-500 text-sm mb-6">Pick the trade and jurisdiction, then select a common skill or describe your own.</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trade</label>
                <div className="grid grid-cols-1 gap-2">
                  {trades.map(t => (
                    <button key={t.id} onClick={() => { setSelectedTrade(t.id); setSkillToDemonstrate('') }}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium text-left transition-colors ${
                        selectedTrade === t.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}>
                      <span className="text-lg">{tradeEmoji[t.slug] || '🔨'}</span>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jurisdiction / Region</label>
                <div className="space-y-2">
                  {regions.map(r => (
                    <button key={r.id} onClick={() => setSelectedRegion(r.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 text-sm transition-colors ${
                        selectedRegion === r.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="font-medium text-gray-800">{r.name}</div>
                      <div className="text-gray-400 text-xs">{r.code_standard}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedTrade && tradeSuggestions.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Common skills for {trades.find(t => t.id === selectedTrade)?.name}</label>
                <div className="grid grid-cols-1 gap-2">
                  {tradeSuggestions.map(s => (
                    <button key={s} onClick={() => { setSkillToDemonstrate(s); setCustomSkill('') }}
                      className={`text-left p-3 rounded-lg border-2 text-sm transition-colors ${
                        skillToDemonstrate === s ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Or describe your own skill to verify</label>
              <input value={customSkill} onChange={e => { setCustomSkill(e.target.value); if (e.target.value) setSkillToDemonstrate('') }}
                placeholder="e.g. Verify correct bonding at service entrance per NEC 250.68"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            <button disabled={!selectedTrade || !(skillToDemonstrate || customSkill)}
              onClick={() => setStep(2)}
              className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next: Your Details →
            </button>
          </div>
        )}

        {/* Step 2: Employer Details */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Who is commissioning this verification?</h2>
            <p className="text-gray-500 text-sm mb-6">We'll send your booking confirmation and post-session feedback survey here.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input value={employerName} onChange={e => setEmployerName(e.target.value)} placeholder="Jane Smith"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                  <input value={employerCompany} onChange={e => setEmployerCompany(e.target.value)} placeholder="Acme Contractors"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Email *</label>
                <input value={employerEmail} onChange={e => setEmployerEmail(e.target.value)} type="email" placeholder="jane@acmecontractors.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Value prop reminder */}
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">What you're getting for $75:</p>
              <ul className="space-y-1">
                <li>✓ 10-minute live session with the tradesperson + journeyman mentor</li>
                <li>✓ Real-time code compliance verification (NEC, ASME, NFPA 99, etc.)</li>
                <li>✓ Mentor's timestamped assessment of the live work</li>
                <li>✓ Jurisdiction-tagged badge issued to tradesperson's wallet on completion</li>
                <li>✓ Full session recording available on request</li>
              </ul>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200">
                ← Back
              </button>
              <button disabled={!employerEmail || !employerName || !employerCompany}
                onClick={() => setStep(3)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
                Next: Pick a Time →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Calendar */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Pick a 10-minute slot</h2>
            <p className="text-gray-500 text-sm mb-6">All times shown in Central Time. Slots are 10 minutes with a vetted journeyman mentor.</p>

            {/* Date selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
              {availableDates.map(d => (
                <button key={d} onClick={() => setSelectedDate(d)}
                  className={`flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-xl border-2 transition-colors ${
                    selectedDate === d ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}>
                  <span className="text-xs font-medium uppercase">{new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="text-xl font-bold">{new Date(d + 'T12:00:00').getDate()}</span>
                  <span className="text-xs">{new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}</span>
                </button>
              ))}
            </div>

            {/* Time slots for selected date */}
            {selectedDate && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-3">{formatDate(selectedDate + 'T12:00:00')} — {slotsForDate.length} available</p>
                {slotsForDate.length === 0 ? (
                  <p className="text-gray-400 text-sm py-6 text-center">No available slots on this date. Try another day.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {slotsForDate.map(slot => (
                      <button key={slot.id} onClick={() => setSelectedSlot(slot)}
                        className={`p-3 rounded-xl border-2 text-sm transition-colors text-left ${
                          selectedSlot?.id === slot.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <div className="font-semibold text-gray-800">{formatTime(slot.slot_start)}</div>
                        <div className="text-gray-500 text-xs mt-0.5">10 min · $75</div>
                        {slot.mentor && (
                          <div className="text-gray-400 text-xs mt-1">w/ {(slot.mentor as any).full_name?.split(' ')[0]}, {(slot.mentor as any).years_experience}yr exp</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(2)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200">
                ← Back
              </button>
              <button disabled={!selectedSlot} onClick={() => setStep(4)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
                Next: Confirm →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && selectedSlot && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Confirm Your Booking</h2>

            <div className="space-y-3 mb-6">
              {[
                { label: 'Skill to Verify', value: customSkill || skillToDemonstrate },
                { label: 'Trade', value: trades.find(t => t.id === selectedTrade)?.name || '—' },
                { label: 'Jurisdiction', value: (() => { const r = regions.find(x => x.id === selectedRegion); return r ? `${r.name} (${r.code_standard})` : '—' })() },
                { label: 'Date & Time', value: `${formatDate(selectedSlot.slot_start)} at ${formatTime(selectedSlot.slot_start)}` },
                { label: 'Duration', value: '10 minutes' },
                { label: 'Mentor', value: (selectedSlot.mentor as any)?.full_name || '—' },
                { label: 'Your Name', value: employerName },
                { label: 'Company', value: employerCompany },
                { label: 'Email', value: employerEmail },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500 w-1/3">{label}</span>
                  <span className="text-sm font-medium text-gray-800 text-right w-2/3">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-3 bg-blue-50 rounded-lg px-4 mt-2">
                <span className="font-semibold text-gray-700">Total (charged after session)</span>
                <span className="font-bold text-blue-700 text-lg">$75</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 mb-6">
              <p>By confirming, you agree that payment of <strong>$75</strong> will be charged to your card on file after the session completes. If the tradesperson no-shows or the session is cancelled, you will not be charged.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200">
                ← Back
              </button>
              <button disabled={loading} onClick={handleBook}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-colors">
                {loading ? 'Booking…' : '✓ Confirm & Book — $75'}
              </button>
            </div>
          </div>
        )}

        {/* Social proof below form */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { stars: 5, quote: '10 minutes to know whether we make the placement vs wasting a day on a site test.', company: 'Midwest Industrial Staffing' },
            { stars: 5, quote: 'Carlos demonstrated torque technique and called out the NEC section without prompting. Would commission again.', company: 'Nexus Electrical Contractors' },
            { stars: 4, quote: 'Worth the $75 vs a failed CA inspection.', company: 'Trinity Mechanical' },
          ].map(t => (
            <div key={t.company} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="text-yellow-400 text-sm mb-2">{'★'.repeat(t.stars)}</div>
              <p className="text-gray-600 text-sm italic mb-3">"{t.quote}"</p>
              <p className="text-gray-400 text-xs">— {t.company}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
