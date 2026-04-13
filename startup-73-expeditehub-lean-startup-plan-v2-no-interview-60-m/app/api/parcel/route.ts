import { NextRequest, NextResponse } from 'next/server'
import { lookupParcel, describeZoning } from '@/lib/parcel'

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')
  if (!address || address.trim().length < 5) {
    return NextResponse.json({ error: 'address required' }, { status: 400 })
  }

  const data = await lookupParcel(address)
  const zoningInfo = describeZoning(data.zoning)

  return NextResponse.json({
    ...data,
    zoning_description: zoningInfo.description,
    adu_eligible: zoningInfo.aduEligible,
    max_adu_sqft: zoningInfo.maxAduSqft,
    adu_notes: zoningInfo.notes,
  })
}
