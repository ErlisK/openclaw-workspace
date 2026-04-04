'use client'

import { useState, useEffect, FormEvent } from 'react'

const PACKS = [
  { emoji: '🦕', name: 'Dinosaurs', color: '#fef3c7', border: '#f59e0b' },
  { emoji: '🚀', name: 'Space', color: '#ede9fe', border: '#7c3aed' },
  { emoji: '🐾', name: 'Animals', color: '#dcfce7', border: '#16a34a' },
  { emoji: '🚗', name: 'Vehicles', color: '#dbeafe', border: '#2563eb' },
  { emoji: '🧚', name: 'Princesses & Fairies', color: '#fce7f3', border: '#db2777' },
  { emoji: '🌊', name: 'Ocean', color: '#cffafe', border: '#0891b2' },
]

const AGE_BRACKETS = ['2–3', '4–5', '6–7', '8–9', '10–12', '13+']

const styles: Record<string, React.CSSProperties> = {
  hero: {
    background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
    color: 'white',
    textAlign: 'center',
    padding: '80px 24px 60px',
  },
  heroEmoji: { fontSize: 72, marginBottom: 16, display: 'block' },
  heroTitle: { fontSize: 52, fontWeight: 900, margin: '0 0 12px', letterSpacing: '-1px' },
  heroSubtitle: { fontSize: 22, fontWeight: 600, margin: '0 0 20px', opacity: 0.95 },
  heroDesc: { fontSize: 17, maxWidth: 600, margin: '0 auto', opacity: 0.9, lineHeight: 1.6 },
  ctaBtn: {
    display: 'inline-block',
    marginTop: 32,
    background: '#fff',
    color: '#7c3aed',
    fontWeight: 800,
    fontSize: 18,
    padding: '14px 36px',
    borderRadius: 50,
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  section: { padding: '64px 24px', maxWidth: 960, margin: '0 auto' },
  sectionTitle: {
    textAlign: 'center',
    fontSize: 34,
    fontWeight: 800,
    color: '#7c3aed',
    marginBottom: 48,
  },
  howGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 },
  howCard: {
    background: '#f5f3ff',
    borderRadius: 20,
    padding: 32,
    textAlign: 'center',
    border: '2px solid #ede9fe',
  },
  howCardIcon: { fontSize: 44, display: 'block', marginBottom: 12 },
  howCardTitle: { fontSize: 18, fontWeight: 700, color: '#5b21b6', marginBottom: 8 },
  howCardDesc: { fontSize: 15, color: '#6b7280', lineHeight: 1.5 },
  packsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 },
  packCard: {
    borderRadius: 20,
    padding: '28px 16px',
    textAlign: 'center',
    cursor: 'default',
    border: '2px solid',
    transition: 'transform 0.15s',
  },
  packEmoji: { fontSize: 48, display: 'block', marginBottom: 10 },
  packName: { fontSize: 14, fontWeight: 700, color: '#374151' },
  formWrapper: {
    background: 'white',
    borderRadius: 24,
    padding: '48px 40px',
    maxWidth: 480,
    margin: '0 auto',
    boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
    border: '1px solid #f3f4f6',
  },
  formTitle: { fontSize: 30, fontWeight: 800, color: '#7c3aed', textAlign: 'center', marginBottom: 6 },
  formSubtitle: { textAlign: 'center', color: '#6b7280', marginBottom: 32, fontSize: 15 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%',
    border: '2px solid #e5e7eb',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    border: '2px solid #e5e7eb',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
    background: 'white',
    cursor: 'pointer',
  },
  consentRow: { display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 4 },
  consentText: { fontSize: 13, color: '#6b7280', lineHeight: 1.5 },
  submitBtn: {
    width: '100%',
    background: '#7c3aed',
    color: 'white',
    fontWeight: 800,
    fontSize: 17,
    padding: '16px',
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    marginTop: 8,
    fontFamily: 'inherit',
  },
  submitBtnDisabled: {
    width: '100%',
    background: '#d1d5db',
    color: '#9ca3af',
    fontWeight: 800,
    fontSize: 17,
    padding: '16px',
    borderRadius: 14,
    border: 'none',
    cursor: 'not-allowed',
    marginTop: 8,
    fontFamily: 'inherit',
  },
  thankyou: { textAlign: 'center', padding: '48px 0' },
  errorMsg: { color: '#dc2626', fontSize: 13, marginTop: 4 },
  footer: {
    textAlign: 'center',
    padding: '40px 24px',
    color: '#9ca3af',
    fontSize: 13,
    borderTop: '1px solid #f3f4f6',
  },
}

export default function Home() {
  const [email, setEmail] = useState('')
  const [parentName, setParentName] = useState('')
  const [ageBracket, setAgeBracket] = useState('')
  const [interests, setInterests] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_name: 'landing_view', props: { referrer: document.referrer } }),
    }).catch(() => {})
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_name: 'waitlist_submit', props: { email } }),
    }).catch(() => {})

    try {
      const interestsList = interests
        ? interests.split(',').map((s) => s.trim()).filter(Boolean)
        : []

      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          parent_first_name: parentName || undefined,
          child_age_bracket: ageBracket || undefined,
          interests: interestsList.length > 0 ? interestsList : undefined,
          consent,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = email.trim() !== '' && consent && !loading

  return (
    <main>
      {/* ── Hero ── */}
      <section style={styles.hero}>
        <span style={styles.heroEmoji}>🎨</span>
        <h1 style={styles.heroTitle}>KidColoring</h1>
        <p style={styles.heroSubtitle}>Kids Make Their Own Coloring Books!</p>
        <p style={styles.heroDesc}>
          Your child picks their favorite topics, and we generate a personalized coloring book
          filled with custom illustrations they can print and color.
        </p>
        <a href="#waitlist" style={styles.ctaBtn}>
          ✏️ Join the Waitlist
        </a>
      </section>

      {/* ── How It Works ── */}
      <section style={{ ...styles.section, background: 'white', maxWidth: '100%' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={styles.sectionTitle}>How It Works</h2>
          <div style={styles.howGrid}>
            {[
              { icon: '1️⃣', title: 'Pick Interests', desc: 'Your child chooses the topics they love — dinosaurs, space, animals, and more.' },
              { icon: '2️⃣', title: 'We Generate', desc: 'Our AI creates unique, age-appropriate coloring pages just for them in seconds.' },
              { icon: '3️⃣', title: 'Print & Color!', desc: 'Download and print your personalized coloring book at home. Hours of fun!' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={styles.howCard}>
                <span style={styles.howCardIcon}>{icon}</span>
                <h3 style={styles.howCardTitle}>{title}</h3>
                <p style={styles.howCardDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interest Packs ── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Interest Packs</h2>
        <div style={styles.packsGrid}>
          {PACKS.map((pack) => (
            <div
              key={pack.name}
              style={{
                ...styles.packCard,
                background: pack.color,
                borderColor: pack.border,
              }}
            >
              <span style={styles.packEmoji}>{pack.emoji}</span>
              <p style={styles.packName}>{pack.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Waitlist Form ── */}
      <section
        id="waitlist"
        style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #fce7f3 100%)', padding: '64px 24px' }}
      >
        <div style={styles.formWrapper}>
          <h2 style={styles.formTitle}>Join the Waitlist</h2>
          <p style={styles.formSubtitle}>Be the first to know when we launch! 🎉</p>

          {done ? (
            <div style={styles.thankyou}>
              <span style={{ fontSize: 72 }}>🎉</span>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed', marginTop: 16 }}>
                You&apos;re on the list!
              </h3>
              <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
                We&apos;ll reach out when KidColoring is ready. Your kids are going to love it!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={styles.label} htmlFor="email">Email Address *</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label} htmlFor="parentName">Your Name (optional)</label>
                <input
                  id="parentName"
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Parent&apos;s first name"
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label} htmlFor="ageBracket">Child&apos;s Age (optional)</label>
                <select
                  id="ageBracket"
                  value={ageBracket}
                  onChange={(e) => setAgeBracket(e.target.value)}
                  style={styles.select}
                >
                  <option value="">Select age range</option>
                  {AGE_BRACKETS.map((b) => (
                    <option key={b} value={b}>{b} years</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label} htmlFor="interests">Child&apos;s Interests (optional)</label>
                <input
                  id="interests"
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g. dinosaurs, space, horses"
                  style={styles.input}
                />
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Separate with commas</p>
              </div>

              <div style={styles.consentRow}>
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0, accentColor: '#7c3aed', width: 16, height: 16 }}
                />
                <label htmlFor="consent" style={styles.consentText}>
                  I&apos;m a parent/guardian and I agree to be contacted about KidColoring updates.
                </label>
              </div>

              {error && <p style={styles.errorMsg}>⚠️ {error}</p>}

              <button
                type="submit"
                disabled={!canSubmit}
                style={canSubmit ? styles.submitBtn : styles.submitBtnDisabled}
              >
                {loading ? '⏳ Joining...' : '🎨 Join the Waitlist'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={styles.footer}>
        <p>© 2025 KidColoring. Made with ❤️ for little artists everywhere.</p>
      </footer>
    </main>
  )
}
