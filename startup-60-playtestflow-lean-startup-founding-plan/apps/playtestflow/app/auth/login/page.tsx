import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-gray-400">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
