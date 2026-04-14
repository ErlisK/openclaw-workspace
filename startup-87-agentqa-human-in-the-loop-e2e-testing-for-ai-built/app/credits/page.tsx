'use client'
import { Suspense } from 'react'
import CreditsContent from './CreditsContent'

export default function CreditsPage() {
  return (
    <Suspense fallback={
      <div data-testid="credits-loading" style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px', color: '#94a3b8', textAlign: 'center' }}>
        Loading credits…
      </div>
    }>
      <CreditsContent />
    </Suspense>
  )
}
