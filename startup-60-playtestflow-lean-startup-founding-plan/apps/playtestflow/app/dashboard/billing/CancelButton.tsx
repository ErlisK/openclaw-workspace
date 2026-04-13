'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'

const CancelModal = dynamic(() => import('@/components/CancelModal'), { ssr: false })

export default function CancelButton({ planId }: { planId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 hover:text-red-400 underline underline-offset-2 transition-colors px-2"
      >
        Cancel plan
      </button>
      {open && (
        <CancelModal
          planId={planId}
          onClose={() => setOpen(false)}
          onCancelled={() => setOpen(false)}
        />
      )}
    </>
  )
}
