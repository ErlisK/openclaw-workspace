import { createClient } from '@/lib/supabase/server'

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch per-month rate data
  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('stream_id, started_at, duration_minutes')
    .eq('user_id', user.id)
    .eq('entry_type', 'billable')
    .order('started_at', { ascending: true })

  const { data: transactions } = await supabase
    .from('transactions')
    .select('stream_id, net_amount, transaction_date')
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: true })

  const { data: streams } = await supabase
    .from('streams')
    .select('id, name')
    .eq('user_id', user.id)

  // Group by month
  const monthlyNet: Record<string, number> = {}
  transactions?.forEach(t => {
    const month = t.transaction_date.substring(0, 7)
    monthlyNet[month] = (monthlyNet[month] || 0) + (t.net_amount ?? 0)
  })

  const monthlyHours: Record<string, number> = {}
  timeEntries?.forEach(t => {
    const month = t.started_at.substring(0, 7)
    monthlyHours[month] = (monthlyHours[month] || 0) + (t.duration_minutes ?? 0) / 60
  })

  const allKeys = Object.keys(monthlyNet).concat(Object.keys(monthlyHours))
  const months = Array.from(new Set(allKeys)).sort()
  const monthlyRates = months.map(m => ({
    month: m,
    net: monthlyNet[m] || 0,
    hours: monthlyHours[m] || 0,
    rate: monthlyHours[m] > 0 ? (monthlyNet[m] || 0) / monthlyHours[m] : 0,
  }))

  const rates = monthlyRates.map(m => m.rate).filter(r => r > 0)
  const avgRate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0
  const maxRate = rates.length ? Math.max(...rates) : 0
  const minRate = rates.length ? Math.min(...rates) : 0

  const totalHours = Object.values(monthlyHours).reduce((a, b) => a + b, 0)
  const hoursPerMonth = months.length > 0 ? totalHours / months.length : 0

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Pricing Lab</h1>
      <p className="text-gray-500 text-sm mb-6">Analyze your rate variance and simulate price changes.</p>

      {monthlyRates.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
          <div className="text-3xl mb-2">🧪</div>
          <p className="text-gray-500 text-sm">Import transactions + log time to see your effective rate history.</p>
          <a href="/import" className="mt-3 inline-block text-blue-600 hover:underline text-sm">Import CSV →</a>
        </div>
      ) : (
        <>
          {/* Rate history bar chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h2 className="font-semibold text-gray-800 mb-4">Effective $/hr — monthly history</h2>
            <div className="flex items-end gap-2 h-32 mb-3">
              {monthlyRates.map(m => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs font-medium text-gray-600">
                    {m.rate > 0 ? `$${Math.round(m.rate)}` : '—'}
                  </div>
                  <div
                    className={`w-full rounded-t ${m.rate === maxRate ? 'bg-blue-600' : m.rate === minRate ? 'bg-red-300' : 'bg-blue-300'}`}
                    style={{ height: `${maxRate > 0 ? (m.rate / maxRate) * 80 + 10 : 10}px` }}
                  />
                  <div className="text-gray-400" style={{ fontSize: '9px' }}>{m.month.substring(5)}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-6 text-sm border-t pt-3">
              <div><span className="text-gray-500">Average</span><div className="font-bold">${avgRate.toFixed(0)}/hr</div></div>
              <div><span className="text-gray-500">Best month</span><div className="font-bold text-green-600">${maxRate.toFixed(0)}/hr</div></div>
              <div><span className="text-gray-500">Worst month</span><div className="font-bold text-red-500">${minRate.toFixed(0)}/hr</div></div>
              <div><span className="text-gray-500">Variance</span>
                <div className="font-bold text-orange-500">
                  {maxRate > 0 ? `${Math.round(((maxRate - minRate) / maxRate) * 100)}%` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Simulator — client-side interactivity via URL param trick isn't possible in SC
              Using a simple static analysis instead */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Rate scenarios (based on {hoursPerMonth.toFixed(0)}h/month avg)</h2>
            <div className="space-y-3">
              {[avgRate * 0.9, avgRate, avgRate * 1.1, avgRate * 1.2, maxRate].map((rate, i) => {
                const label = ['−10%', 'Current avg', '+10%', '+20%', 'Best month rate'][i]
                const monthly = rate * hoursPerMonth
                return (
                  <div key={i} className="flex items-center gap-4">
                    <div className="text-sm text-gray-600 w-32">{label}</div>
                    <div className="text-sm font-bold w-20">${rate.toFixed(0)}/hr</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${i === 1 ? 'bg-blue-500' : i > 1 ? 'bg-green-400' : 'bg-red-300'}`}
                        style={{ width: `${maxRate > 0 ? (rate / (maxRate * 1.1)) * 100 : 0}%` }}
                      />
                    </div>
                    <div className={`text-sm font-bold w-28 text-right ${i > 1 ? 'text-green-600' : i === 0 ? 'text-red-500' : 'text-gray-700'}`}>
                      ${monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                    </div>
                    <div className="text-xs text-gray-400 w-24 text-right">
                      ${(monthly * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Based on {hoursPerMonth.toFixed(0)} billable hours/month average. Actual results depend on client retention.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
