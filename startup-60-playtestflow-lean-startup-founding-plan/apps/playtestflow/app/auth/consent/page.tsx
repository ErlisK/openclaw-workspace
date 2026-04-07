import { Suspense } from 'react'
import ConsentForm from './ConsentForm'

export default function ConsentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d1117]" />}>
      <ConsentForm />
    </Suspense>
  )
}
