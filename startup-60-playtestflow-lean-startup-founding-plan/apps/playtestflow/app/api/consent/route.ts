import { createClient, createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { token } = await request.json()
  if (!token) return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 })

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('session_signups')
    .update({
      consent_given: true,
      consent_given_at: new Date().toISOString(),
      consent_version: 'v1',
    })
    .eq('consent_token', token)

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
