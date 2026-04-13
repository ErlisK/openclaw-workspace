/**
 * Austin GIS / Parcel data utilities
 *
 * Strategy (in priority order):
 * 1. Austin ArcGIS REST API for zoning + parcel data (works from Vercel edge)
 * 2. Travis CAD public search for owner/value data
 * 3. Nominatim (OSM) for geocoding + fallback address parsing
 * 4. Return partial data gracefully — never block the workflow
 */

export interface ParcelData {
  address: string
  lat: number | null
  lng: number | null
  zip: string | null
  parcel_id: string | null
  zoning: string | null
  zoning_description: string | null
  lot_size_sqft: number | null
  year_built: number | null
  existing_sqft: number | null
  owner_name: string | null
  legal_description: string | null
  source: string
  raw: Record<string, unknown>
}

const AUSTIN_GIS_BASE =
  'https://gis.austintexas.gov/arcgis/rest/services'

/** Geocode an address string using Nominatim (OSM). Always works. */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number; zip: string | null } | null> {
  try {
    const encoded = encodeURIComponent(`${address}, Austin TX`)
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&addressdetails=1&countrycodes=us`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ExpediteHub/1.0 (permit-platform)' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.length) return null
    const r = data[0]
    return {
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      zip: r.address?.postcode ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Query Austin's ArcGIS zoning layer using lat/lng coordinates.
 * Returns zoning code + description, lot size, and parcel ID.
 */
export async function queryAustinZoning(
  lat: number,
  lng: number
): Promise<Partial<ParcelData>> {
  try {
    // Austin Zoning layer
    const zoningUrl =
      `${AUSTIN_GIS_BASE}/Planning/Zoning/MapServer/0/query` +
      `?geometry=${lng},${lat}&geometryType=esriGeometryPoint` +
      `&inSR=4326&spatialRel=esriSpatialRelIntersects` +
      `&outFields=ZONING_ZTYPE,OBJECTID,Shape_Area&f=json&returnGeometry=false`

    const res = await fetch(zoningUrl, { next: { revalidate: 3600 } })
    if (!res.ok) return {}
    const data = await res.json()
    const feature = data?.features?.[0]?.attributes
    if (!feature) return {}

    return {
      zoning: feature.ZONING_ZTYPE ?? null,
      lot_size_sqft: feature.Shape_Area
        ? Math.round(parseFloat(feature.Shape_Area))
        : null,
      parcel_id: String(feature.OBJECTID ?? ''),
    }
  } catch {
    return {}
  }
}

/**
 * Query Austin parcel layer for existing building data.
 */
export async function queryAustinParcel(
  lat: number,
  lng: number
): Promise<Partial<ParcelData>> {
  try {
    const parcelUrl =
      `${AUSTIN_GIS_BASE}/Assessments/Building_Footprints/MapServer/0/query` +
      `?geometry=${lng},${lat}&geometryType=esriGeometryPoint` +
      `&inSR=4326&spatialRel=esriSpatialRelIntersects` +
      `&outFields=YR_BLT,BLDG_SQFT,ADDR_LINE1,PROP_ID&f=json&returnGeometry=false`

    const res = await fetch(parcelUrl, { next: { revalidate: 3600 } })
    if (!res.ok) return {}
    const data = await res.json()
    const feature = data?.features?.[0]?.attributes
    if (!feature) return {}

    return {
      year_built: feature.YR_BLT ? parseInt(feature.YR_BLT) : null,
      existing_sqft: feature.BLDG_SQFT
        ? parseFloat(feature.BLDG_SQFT)
        : null,
      parcel_id: feature.PROP_ID ?? null,
    }
  } catch {
    return {}
  }
}

/** 
 * Full parcel lookup — combines geocoding + zoning + parcel.
 * Returns whatever it can find; never throws.
 */
export async function lookupParcel(address: string): Promise<ParcelData> {
  const base: ParcelData = {
    address,
    lat: null,
    lng: null,
    zip: null,
    parcel_id: null,
    zoning: null,
    zoning_description: null,
    lot_size_sqft: null,
    year_built: null,
    existing_sqft: null,
    owner_name: null,
    legal_description: null,
    source: 'nominatim+austin_gis',
    raw: {},
  }

  // Step 1: geocode
  const geo = await geocodeAddress(address)
  if (!geo) return { ...base, source: 'geocode_failed' }

  base.lat = geo.lat
  base.lng = geo.lng
  base.zip = geo.zip

  // Step 2: zoning (best-effort)
  const [zoning, parcel] = await Promise.allSettled([
    queryAustinZoning(geo.lat, geo.lng),
    queryAustinParcel(geo.lat, geo.lng),
  ])

  if (zoning.status === 'fulfilled') {
    Object.assign(base, zoning.value)
  }
  if (parcel.status === 'fulfilled') {
    Object.assign(base, parcel.value)
  }

  return base
}

/**
 * Map Austin zoning codes to human-readable descriptions + ADU eligibility.
 * Source: Austin Land Development Code §25-2
 */
export function describeZoning(zoneCode: string | null): {
  description: string
  aduEligible: boolean
  maxAduSqft: number | null
  notes: string
} {
  if (!zoneCode) {
    return {
      description: 'Unknown — manual review required',
      aduEligible: false,
      maxAduSqft: null,
      notes: 'Zoning data unavailable',
    }
  }

  const code = zoneCode.toUpperCase().trim()

  const map: Record<string, { description: string; aduEligible: boolean; maxAduSqft: number | null; notes: string }> = {
    SF_1:   { description: 'Single Family Residence — Large Lot', aduEligible: true,  maxAduSqft: 1100, notes: 'Detached ADU permitted; DADU rules apply' },
    SF_2:   { description: 'Single Family Residence',             aduEligible: true,  maxAduSqft: 1100, notes: 'Detached ADU permitted; DADU rules apply' },
    SF_3:   { description: 'Family Residence',                    aduEligible: true,  maxAduSqft: 1100, notes: 'ADU permitted; check setbacks' },
    MF_1:   { description: 'Limited Density Multifamily',        aduEligible: true,  maxAduSqft: 1100, notes: 'ADU likely permitted; verify with COA' },
    MF_2:   { description: 'Low Density Multifamily',            aduEligible: true,  maxAduSqft: 1100, notes: 'ADU likely permitted; verify with COA' },
    RR:     { description: 'Rural Residence',                     aduEligible: true,  maxAduSqft: 1100, notes: 'ADU typically permitted on larger lots' },
    MH:     { description: 'Mobile Home Residence',               aduEligible: false, maxAduSqft: null, notes: 'ADU generally not permitted in MH zones' },
    CS:     { description: 'General Commercial Services',         aduEligible: false, maxAduSqft: null, notes: 'Residential ADU not applicable in commercial zones' },
    CS_MU:  { description: 'Commercial Services — Mixed Use',     aduEligible: true,  maxAduSqft: 1100, notes: 'Residential unit may be permitted as part of mixed-use' },
    NO:     { description: 'Neighborhood Office',                 aduEligible: false, maxAduSqft: null, notes: 'Residential ADU not applicable' },
  }

  // Normalize key (replace dash/space variations)
  const normalized = code.replace('-', '_').replace(' ', '_')
  const entry = map[normalized] ?? map[code]

  if (entry) return entry

  // Heuristic fallback
  if (code.startsWith('SF') || code.startsWith('MF') || code === 'RR') {
    return {
      description: `Residential Zone (${zoneCode})`,
      aduEligible: true,
      maxAduSqft: 1100,
      notes: 'ADU likely eligible — verify setbacks with City of Austin',
    }
  }

  return {
    description: `${zoneCode} — manual review required`,
    aduEligible: false,
    maxAduSqft: null,
    notes: 'Unknown zone code — check Austin Land Development Code',
  }
}
