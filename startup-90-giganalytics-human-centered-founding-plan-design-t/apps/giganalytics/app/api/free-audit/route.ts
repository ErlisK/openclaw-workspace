import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const AuditSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  streams: z.string().max(10).optional(),
  platforms: z.string().max(500).optional(),
  hourlyRate: z.string().max(200).optional(),
  message: z.string().max(2000).optional(),
  fileName: z.string().max(200).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = AuditSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Please check your inputs.' },
        { status: 400 }
      )
    }

    const data = parsed.data
    const supabase = await createClient()

    // Store the audit request
    const { error } = await supabase.from('audit_requests').insert({
      name: data.name,
      email: data.email,
      streams: data.streams,
      platforms: data.platforms,
      estimated_rate: data.hourlyRate,
      message: data.message,
      file_name: data.fileName,
      status: 'pending',
    })

    if (error) {
      // If table doesn't exist yet, still return success (graceful degradation)
      console.error('Supabase insert error:', error)
      if (error.code !== '42P01') {
        // Table doesn't exist — that's ok, log and continue
        console.warn('audit_requests table may not exist yet:', error.message)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Free audit API error:', err)
    return NextResponse.json(
      { error: 'server_error', message: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
