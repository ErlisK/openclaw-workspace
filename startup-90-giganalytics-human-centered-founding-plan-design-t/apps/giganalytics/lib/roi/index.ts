/**
 * ROI Engine — GigAnalytics
 *
 * Computes per-stream true hourly rates, acquisition ROI, and heatmap data
 * from raw Supabase query results. Pure functions — no DB access here.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawTransaction {
  stream_id: string | null
  net_amount: number
  amount: number
  fee_amount: number
  transaction_date: string
}

export interface RawTimeEntry {
  stream_id: string | null
  duration_minutes: number
  entry_type: string
  started_at: string  // ISO
}

export interface RawAcquisitionCost {
  stream_id: string | null
  channel: string
  amount: number
  period_start: string
  period_end: string
}

export interface RawStream {
  id: string
  name: string
  color: string
  platform: string | null
}

// ─── Per-Stream ROI ───────────────────────────────────────────────────────────

export interface StreamROI {
  streamId: string
  name: string
  color: string
  platform: string | null

  // Revenue
  grossRevenue: number
  platformFees: number
  netRevenue: number
  txCount: number

  // Time
  totalMinutes: number           // all entry types
  billableMinutes: number        // entry_type = 'billable' only
  totalHours: number
  billableHours: number

  // Rates
  trueHourlyRate: number         // net / total hours (incl proposal/admin)
  billableHourlyRate: number     // net / billable hours only
  effectiveRateAfterAcq: number  // net - acquisition costs / billable hours

  // Acquisition
  acquisitionCosts: number
  acquisitionROI: number         // (net - costs) / costs * 100
  costPerHour: number            // acquisition costs / total hours

  // Trend helper
  revenueByMonth: Record<string, number>  // YYYY-MM → net
}

export interface AcquisitionSourceROI {
  channel: string
  totalSpend: number
  linkedRevenue: number          // revenue from streams that listed this channel
  roi: number                    // (revenue - spend) / spend * 100
  roas: number                   // revenue / spend
}

export interface HeatmapCell {
  weekday: number   // 0=Sun, 1=Mon…6=Sat
  hour: number      // 0–23
  minutes: number   // total logged minutes in this slot
  earnings: number  // net earnings attributed to this slot
  rate: number      // earnings / (minutes/60)
}

export interface ROISnapshot {
  streams: StreamROI[]
  aggregate: {
    grossRevenue: number
    netRevenue: number
    platformFees: number
    acquisitionCosts: number
    totalHours: number
    billableHours: number
    trueHourlyRate: number
    billableHourlyRate: number
    netAfterAllCosts: number
    effectiveHourlyRate: number
    topStream: string | null
    topStreamRate: number
  }
  acquisitionBySource: AcquisitionSourceROI[]
  heatmap: HeatmapCell[]
  dateRange: { from: string; to: string }
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function computeROI(
  streams: RawStream[],
  transactions: RawTransaction[],
  timeEntries: RawTimeEntry[],
  acquisitionCosts: RawAcquisitionCost[],
  dateRange: { from: string; to: string }
): ROISnapshot {

  const streamMap = new Map(streams.map(s => [s.id, s]))

  // ── Per-stream revenue ──
  const revenueByStream = new Map<string, { gross: number; net: number; fees: number; count: number; byMonth: Record<string, number> }>()
  for (const tx of transactions) {
    const key = tx.stream_id ?? '__none__'
    if (!revenueByStream.has(key)) {
      revenueByStream.set(key, { gross: 0, net: 0, fees: 0, count: 0, byMonth: {} })
    }
    const r = revenueByStream.get(key)!
    r.gross += tx.amount
    r.net += tx.net_amount
    r.fees += tx.fee_amount
    r.count++
    const month = tx.transaction_date.slice(0, 7) // YYYY-MM
    r.byMonth[month] = (r.byMonth[month] ?? 0) + tx.net_amount
  }

  // ── Per-stream time ──
  const timeByStream = new Map<string, { total: number; billable: number }>()
  for (const te of timeEntries) {
    const key = te.stream_id ?? '__none__'
    if (!timeByStream.has(key)) timeByStream.set(key, { total: 0, billable: 0 })
    const t = timeByStream.get(key)!
    t.total += te.duration_minutes
    if (te.entry_type === 'billable') t.billable += te.duration_minutes
  }

  // ── Per-stream acquisition costs ──
  const costByStream = new Map<string, number>()
  const costByChannel = new Map<string, number>()
  for (const c of acquisitionCosts) {
    const key = c.stream_id ?? '__none__'
    costByStream.set(key, (costByStream.get(key) ?? 0) + c.amount)
    costByChannel.set(c.channel, (costByChannel.get(c.channel) ?? 0) + c.amount)
  }

  // ── Build per-stream ROI ──
  const allStreamIds = new Set([
    ...streams.map(s => s.id),
    ...Array.from(revenueByStream.keys()).filter(k => k !== '__none__'),
  ])

  const streamROIs: StreamROI[] = []
  Array.from(allStreamIds).forEach(sid => {
    const s = streamMap.get(sid)
    if (!s) return  // skip (forEach)

    const rev = revenueByStream.get(sid) ?? { gross: 0, net: 0, fees: 0, count: 0, byMonth: {} }
    const time = timeByStream.get(sid) ?? { total: 0, billable: 0 }
    const acq = costByStream.get(sid) ?? 0

    const totalHours = time.total / 60
    const billableHours = time.billable / 60

    const trueHourlyRate = totalHours > 0 ? rev.net / totalHours : 0
    const billableHourlyRate = billableHours > 0 ? rev.net / billableHours : 0
    const netAfterAcq = rev.net - acq
    const effectiveRateAfterAcq = billableHours > 0 ? netAfterAcq / billableHours : 0
    const acquisitionROI = acq > 0 ? ((rev.net - acq) / acq) * 100 : 0
    const costPerHour = totalHours > 0 ? acq / totalHours : 0

    streamROIs.push({
      streamId: sid,
      name: s.name,
      color: s.color,
      platform: s.platform,
      grossRevenue: rev.gross,
      platformFees: rev.fees,
      netRevenue: rev.net,
      txCount: rev.count,
      totalMinutes: time.total,
      billableMinutes: time.billable,
      totalHours,
      billableHours,
      trueHourlyRate,
      billableHourlyRate,
      effectiveRateAfterAcq,
      acquisitionCosts: acq,
      acquisitionROI,
      costPerHour,
      revenueByMonth: rev.byMonth,
    })
  })

  // Sort by net revenue desc
  streamROIs.sort((a, b) => b.netRevenue - a.netRevenue)

  // ── Aggregate ──
  const totalGross = streamROIs.reduce((s, r) => s + r.grossRevenue, 0)
  const totalNet = streamROIs.reduce((s, r) => s + r.netRevenue, 0)
  const totalFees = streamROIs.reduce((s, r) => s + r.platformFees, 0)
  const totalAcq = streamROIs.reduce((s, r) => s + r.acquisitionCosts, 0)
  const totalHours = streamROIs.reduce((s, r) => s + r.totalHours, 0)
  const totalBillable = streamROIs.reduce((s, r) => s + r.billableHours, 0)

  const aggregate = {
    grossRevenue: totalGross,
    netRevenue: totalNet,
    platformFees: totalFees,
    acquisitionCosts: totalAcq,
    totalHours,
    billableHours: totalBillable,
    trueHourlyRate: totalHours > 0 ? totalNet / totalHours : 0,
    billableHourlyRate: totalBillable > 0 ? totalNet / totalBillable : 0,
    netAfterAllCosts: totalNet - totalAcq,
    effectiveHourlyRate: totalBillable > 0 ? (totalNet - totalAcq) / totalBillable : 0,
    topStream: streamROIs[0]?.name ?? null,
    topStreamRate: streamROIs[0]?.trueHourlyRate ?? 0,
  }

  // ── Acquisition by source ──
  // Link channels to streams via acquisitionCosts
  const channelRevenueMap = new Map<string, number>()
  for (const c of acquisitionCosts) {
    const streamRev = revenueByStream.get(c.stream_id ?? '__none__')
    if (streamRev) {
      channelRevenueMap.set(c.channel, (channelRevenueMap.get(c.channel) ?? 0) + streamRev.net)
    }
  }

  const acquisitionBySource: AcquisitionSourceROI[] = Array.from(costByChannel.entries()).map(([channel, spend]) => {
    const revenue = channelRevenueMap.get(channel) ?? 0
    return {
      channel,
      totalSpend: spend,
      linkedRevenue: revenue,
      roi: spend > 0 ? ((revenue - spend) / spend) * 100 : 0,
      roas: spend > 0 ? revenue / spend : 0,
    }
  }).sort((a, b) => b.roi - a.roi)

  // ── Heatmap ──
  // Build weekday×hour grid from time_entries
  // Attribute earnings by distributing stream net revenue evenly over its time entries
  const revenuePerMinuteByStream = new Map<string, number>()
  for (const sr of streamROIs) {
    if (sr.totalMinutes > 0) {
      revenuePerMinuteByStream.set(sr.streamId, sr.netRevenue / sr.totalMinutes)
    }
  }

  const heatmapMap = new Map<string, HeatmapCell>()
  for (const te of timeEntries) {
    const d = new Date(te.started_at)
    const weekday = d.getDay()   // 0=Sun
    const hour = d.getHours()
    const key = `${weekday}_${hour}`

    if (!heatmapMap.has(key)) {
      heatmapMap.set(key, { weekday, hour, minutes: 0, earnings: 0, rate: 0 })
    }
    const cell = heatmapMap.get(key)!
    cell.minutes += te.duration_minutes
    const rpm = te.stream_id ? (revenuePerMinuteByStream.get(te.stream_id) ?? 0) : 0
    cell.earnings += te.duration_minutes * rpm
  }

  // Compute rates
  const heatmap: HeatmapCell[] = []
  Array.from(heatmapMap.values()).forEach(cell => {
    cell.rate = cell.minutes > 0 ? cell.earnings / (cell.minutes / 60) : 0
    heatmap.push(cell)
  })

  return {
    streams: streamROIs,
    aggregate,
    acquisitionBySource,
    heatmap,
    dateRange,
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function fmt$(n: number, digits = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n)
}

export function fmtRate(n: number): string {
  return `${fmt$(n, 2)}/hr`
}
