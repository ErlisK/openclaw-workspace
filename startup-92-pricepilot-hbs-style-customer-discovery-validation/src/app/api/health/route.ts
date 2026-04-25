import { NextResponse } from 'next/server'

export async function GET() {
  // Return minimal info — avoid leaking stack version and DB connection status publicly
  return NextResponse.json({ status: 'ok' })
}
