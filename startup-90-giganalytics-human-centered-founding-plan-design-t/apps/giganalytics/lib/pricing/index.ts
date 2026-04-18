/**
 * Pricing Engine — GigAnalytics
 *
 * Groups transactions into price buckets per stream,
 * computes observed revenue/hour and conversion proxy,
 * and provides rule-based price suggestions for target income.
 */

export interface RawTx {
  stream_id: string | null
  net_amount: number
  amount: number
  transaction_date: string
}

export interface RawTimeEntry {
  stream_id: string | null
  duration_minutes: number
  entry_type: string
  started_at: string
}

export interface RawStream {
  id: string
  name: string
  color: string
}

// ─── Price Bucket Analysis ────────────────────────────────────────────────────

export interface PriceBucket {
  label: string         // e.g. "$0–$100"
  min: number
  max: number
  txCount: number
  totalRevenue: number  // sum of net_amount in bucket
  avgRevenue: number    // totalRevenue / txCount
  // Conversion proxy: transactions per billable hour in this bucket's period
  conversionProxy: number
  revenuePerHour: number
}

export interface StreamPricing {
  streamId: string
  name: string
  color: string
  currentAvgRate: number      // mean transaction amount
  currentHourlyRate: number   // net revenue / billable hours
  buckets: PriceBucket[]
  sweetSpotBucket: PriceBucket | null  // highest revenuePerHour
  txCount: number
  totalRevenue: number
  totalBillableHours: number
}

// Auto-generate buckets from a list of amounts
function autoBuckets(amounts: number[]): Array<{ min: number; max: number; label: string }> {
  if (amounts.length === 0) return []
  const sorted = [...amounts].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const range = max - min

  let step: number
  if (max <= 100) step = 25
  else if (max <= 500) step = 100
  else if (max <= 2000) step = 250
  else if (max <= 5000) step = 500
  else if (max <= 20000) step = 2000
  else step = 5000

  // Align to step
  const bucketMin = Math.floor(min / step) * step
  const bucketMax = Math.ceil(max / step) * step

  const buckets: Array<{ min: number; max: number; label: string }> = []
  for (let b = bucketMin; b < bucketMax; b += step) {
    const lo = b
    const hi = b + step
    buckets.push({
      min: lo,
      max: hi,
      label: lo >= 1000 ? `$${(lo/1000).toFixed(0)}k–$${(hi/1000).toFixed(0)}k` : `$${lo}–$${hi}`,
    })
  }
  return buckets
}

export function computeStreamPricing(
  stream: RawStream,
  transactions: RawTx[],
  timeEntries: RawTimeEntry[]
): StreamPricing {
  const streamTx = transactions.filter(t => t.stream_id === stream.id)
  const streamTime = timeEntries.filter(t => t.stream_id === stream.id && t.entry_type === 'billable')

  const txCount = streamTx.length
  const totalRevenue = streamTx.reduce((s, t) => s + t.net_amount, 0)
  const totalBillableMinutes = streamTime.reduce((s, t) => s + t.duration_minutes, 0)
  const totalBillableHours = totalBillableMinutes / 60

  const currentAvgRate = txCount > 0 ? totalRevenue / txCount : 0
  const currentHourlyRate = totalBillableHours > 0 ? totalRevenue / totalBillableHours : 0

  if (txCount === 0) {
    return { streamId: stream.id, name: stream.name, color: stream.color, currentAvgRate: 0, currentHourlyRate: 0, buckets: [], sweetSpotBucket: null, txCount: 0, totalRevenue: 0, totalBillableHours: 0 }
  }

  const amounts = streamTx.map(t => t.net_amount)
  const bucketDefs = autoBuckets(amounts)

  const buckets: PriceBucket[] = bucketDefs.map(def => {
    const inBucket = streamTx.filter(t => t.net_amount >= def.min && t.net_amount < def.max)
    const bucketTx = inBucket.length
    const bucketRevenue = inBucket.reduce((s, t) => s + t.net_amount, 0)

    // Time logged in same calendar period as bucket transactions
    const dates = inBucket.map(t => t.transaction_date).sort()
    const periodFrom = dates[0]
    const periodTo = dates[dates.length - 1]
    const periodTime = streamTime.filter(t => {
      const d = t.started_at.slice(0, 10)
      return d >= periodFrom && d <= periodTo
    })
    const periodHours = periodTime.reduce((s, t) => s + t.duration_minutes, 0) / 60

    const revenuePerHour = periodHours > 0 ? bucketRevenue / periodHours : 0
    // Conversion proxy: transactions per period hour (higher = more volume efficiency)
    const conversionProxy = periodHours > 0 ? bucketTx / periodHours : 0

    return {
      label: def.label,
      min: def.min,
      max: def.max,
      txCount: bucketTx,
      totalRevenue: bucketRevenue,
      avgRevenue: bucketTx > 0 ? bucketRevenue / bucketTx : 0,
      conversionProxy,
      revenuePerHour,
    }
  }).filter(b => b.txCount > 0)

  // Sweet spot: best revenuePerHour (with fallback to totalRevenue if no time data)
  const sweetSpotBucket = buckets.length > 0
    ? buckets.reduce((best, b) => {
        const score = b.revenuePerHour > 0 ? b.revenuePerHour : b.totalRevenue
        const bestScore = best.revenuePerHour > 0 ? best.revenuePerHour : best.totalRevenue
        return score > bestScore ? b : best
      })
    : null

  return { streamId: stream.id, name: stream.name, color: stream.color, currentAvgRate, currentHourlyRate, buckets, sweetSpotBucket, txCount, totalRevenue, totalBillableHours }
}

// ─── What-If Target Income Calculator ────────────────────────────────────────

export interface PriceSuggestion {
  scenario: string
  suggestedRate: number          // per project/transaction
  requiredTransactions: number   // to hit monthly target
  requiredHours: number          // at current hourly rate
  feasibility: 'easy' | 'stretch' | 'hard' | 'requires_rate_increase'
  insight: string
}

export interface WhatIfResult {
  monthlyTarget: number
  currentMonthlyRevenue: number  // avg of last 3 months
  currentAvgTxSize: number
  currentHourlyRate: number
  gapToTarget: number
  suggestions: PriceSuggestion[]
  hoursNeededAtCurrentRate: number
}

export function computeWhatIf(
  monthlyTarget: number,
  allTransactions: RawTx[],
  allTimeEntries: RawTimeEntry[],
  selectedStreamId?: string
): WhatIfResult {
  const txFilter = selectedStreamId
    ? allTransactions.filter(t => t.stream_id === selectedStreamId)
    : allTransactions
  const teFilter = selectedStreamId
    ? allTimeEntries.filter(t => t.stream_id === selectedStreamId && t.entry_type === 'billable')
    : allTimeEntries.filter(t => t.entry_type === 'billable')

  // Last 3 months revenue
  const now = new Date()
  const monthlyRevs: number[] = []
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = d.toISOString().slice(0, 7)
    const rev = txFilter
      .filter(t => t.transaction_date.startsWith(monthStr))
      .reduce((s, t) => s + t.net_amount, 0)
    monthlyRevs.push(rev)
  }
  const currentMonthlyRevenue = monthlyRevs.filter(r => r > 0).length > 0
    ? monthlyRevs.reduce((s, r) => s + r, 0) / monthlyRevs.filter(r => r > 0).length
    : 0

  const currentAvgTxSize = txFilter.length > 0
    ? txFilter.reduce((s, t) => s + t.net_amount, 0) / txFilter.length
    : 0

  const totalBillableHours = teFilter.reduce((s, t) => s + t.duration_minutes, 0) / 60
  // Monthly hours (last 90 days → /3)
  const monthlyBillableHours = totalBillableHours / 3

  const currentHourlyRate = monthlyBillableHours > 0 ? currentMonthlyRevenue / monthlyBillableHours : 0

  const gapToTarget = monthlyTarget - currentMonthlyRevenue
  const hoursNeededAtCurrentRate = currentHourlyRate > 0 ? monthlyTarget / currentHourlyRate : 0

  const suggestions: PriceSuggestion[] = []

  // Scenario 1: Same rate, more transactions
  if (currentAvgTxSize > 0) {
    const required = Math.ceil(monthlyTarget / currentAvgTxSize)
    const currentMonthlyTxCount = txFilter.length / 3
    const overage = required / Math.max(currentMonthlyTxCount, 1)
    suggestions.push({
      scenario: 'Same price, more volume',
      suggestedRate: currentAvgTxSize,
      requiredTransactions: required,
      requiredHours: hoursNeededAtCurrentRate,
      feasibility: overage <= 1.2 ? 'easy' : overage <= 2 ? 'stretch' : 'hard',
      insight: `You'd need ${required} transactions/month at your current avg ${fmt$(currentAvgTxSize)}. That's ${overage.toFixed(1)}× your recent pace.`,
    })
  }

  // Scenario 2: Raise price 20%
  const raised20 = currentAvgTxSize * 1.2
  if (raised20 > 0) {
    const required = Math.ceil(monthlyTarget / raised20)
    const currentMonthlyTxCount = txFilter.length / 3
    suggestions.push({
      scenario: '+20% price increase',
      suggestedRate: raised20,
      requiredTransactions: required,
      requiredHours: monthlyBillableHours > 0 ? monthlyTarget / (currentHourlyRate * 1.2) : 0,
      feasibility: required <= currentMonthlyTxCount * 0.9 ? 'easy' : 'stretch',
      insight: `Raising avg to ${fmt$(raised20)} means only ${required} transactions needed — and likely same or better conversion if quality holds.`,
    })
  }

  // Scenario 3: Raise price 50%
  const raised50 = currentAvgTxSize * 1.5
  if (raised50 > 0) {
    const required = Math.ceil(monthlyTarget / raised50)
    const currentMonthlyTxCount = txFilter.length / 3
    const feasible = required <= currentMonthlyTxCount * 0.75
    suggestions.push({
      scenario: '+50% premium positioning',
      suggestedRate: raised50,
      requiredTransactions: required,
      requiredHours: monthlyBillableHours > 0 ? monthlyTarget / (currentHourlyRate * 1.5) : 0,
      feasibility: feasible ? 'stretch' : 'requires_rate_increase',
      insight: `At ${fmt$(raised50)}/project you'd need only ${required} clients. Positioning as premium tier could unlock this.`,
    })
  }

  // Scenario 4: Fewer but bigger (hit target with 3 large projects)
  if (monthlyTarget > 0) {
    const bigTicket = monthlyTarget / 3
    suggestions.push({
      scenario: '3 large projects/month',
      suggestedRate: bigTicket,
      requiredTransactions: 3,
      requiredHours: currentHourlyRate > 0 ? bigTicket / currentHourlyRate * 3 : 0,
      feasibility: bigTicket > currentAvgTxSize * 2 ? 'requires_rate_increase' : 'stretch',
      insight: `3 projects at ${fmt$(bigTicket)} each hits your target. This means upselling to larger scopes or retainers.`,
    })
  }

  return { monthlyTarget, currentMonthlyRevenue, currentAvgTxSize, currentHourlyRate, gapToTarget, suggestions, hoursNeededAtCurrentRate }
}

function fmt$(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
