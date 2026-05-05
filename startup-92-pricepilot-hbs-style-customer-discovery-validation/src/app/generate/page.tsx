import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import GenerateClient from './GenerateClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Generate Demo Data — PricingSim',
  description: 'Synthetic transaction generator for demos, engine testing, and Playwright fixtures.',
}

export default async function GeneratePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f9fafb' }}>
      <nav style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="/dashboard" style={{ fontWeight: 700, color: '#4f46e5', textDecoration: 'none' }}>PricingSim</a>
          <a href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>Dashboard</a>
          <span style={{ color: '#4f46e5', fontWeight: 600, fontSize: '0.875rem' }}>Generate Data</span>
        </div>
      </nav>
      <main style={{ padding: '1rem' }}>
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading generator…</div>}>
          <GenerateClient />
        </Suspense>
      </main>
    </div>
  )
}
