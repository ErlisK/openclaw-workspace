import { createClient } from '@/lib/supabase/server'

export default async function ROIPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString().split('T')[0]

  const [{ data: streams }, { data: transactions }, { data: acqCosts }, { data: timeEntries }] =
    await Promise.all([
      supabase.from('streams').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('stream_id,amount,net_amount,fee_amount').eq('user_id', user.id).gte('transaction_date', since),
      supabase.from('acquisition_costs').select('*').eq('user_id', user.id).gte('period_start', since),
      supabase.from('time_entries').select('stream_id,duration_minutes').eq('user_id', user.id).eq('entry_type', 'billable').gte('started_at', thirtyDaysAgo.toISOString()),
    ])

  const streamMap = new Map(streams?.map(s => [s.id, s]) ?? [])

  // Aggregate by stream
  const revenueMap: Record<string, { gross: number; net: number; fees: number; hours: number }> = {}

  transactions?.forEach(t => {
    const sid = t.stream_id ?? '__none__'
    if (!revenueMap[sid]) revenueMap[sid] = { gross: 0, net: 0, fees: 0, hours: 0 }
    revenueMap[sid].gross += t.amount ?? 0
    revenueMap[sid].net += t.net_amount ?? t.amount ?? 0
    revenueMap[sid].fees += t.fee_amount ?? 0
  })

  timeEntries?.forEach(t => {
    const sid = t.stream_id ?? '__none__'
    if (!revenueMap[sid]) revenueMap[sid] = { gross: 0, net: 0, fees: 0, hours: 0 }
    revenueMap[sid].hours += (t.duration_minutes ?? 0) / 60
  })

  const acqMap: Record<string, number> = {}
  acqCosts?.forEach(c => {
    const sid = c.stream_id ?? '__none__'
    acqMap[sid] = (acqMap[sid] || 0) + c.amount
  })

  const rows = Object.entries(revenueMap).map(([sid, data]) => {
    const stream = streamMap.get(sid)
    const adSpend = acqMap[sid] || 0
    const totalCost = data.fees + adSpend
    const roi = totalCost > 0 ? data.net / totalCost : null
    const rate = data.hours > 0 ? data.net / data.hours : null
    return {
      name: stream?.name ?? 'Unassigned',
      gross: data.gross,
      net: data.net,
      fees: data.fees,
      adSpend,
      totalCost,
      roi,
      rate,
      hours: data.hours,
    }
  }).sort((a, b) => b.net - a.net)

  const totals = rows.reduce((acc, r) => ({
    gross: acc.gross + r.gross,
    net: acc.net + r.net,
    cost: acc.cost + r.totalCost,
  }), { gross: 0, net: 0, cost: 0 })

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Acquisition ROI</h1>
      <p className="text-gray-500 text-sm mb-6">Cost of earning from each stream — platform fees + ad spend · last 30 days</p>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
          <div className="text-3xl mb-2">💰</div>
          <p className="text-gray-500 text-sm">Import transactions to see your ROI per stream.</p>
          <a href="/import" className="mt-3 inline-block text-blue-600 hover:underline text-sm">Import CSV →</a>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500">
                <th className="text-left px-4 py-3 font-medium">Stream</th>
                <th className="text-right px-4 py-3 font-medium">Gross</th>
                <th className="text-right px-4 py-3 font-medium">Fees</th>
                <th className="text-right px-4 py-3 font-medium">Ad Spend</th>
                <th className="text-right px-4 py-3 font-medium">Net</th>
                <th className="text-right px-4 py-3 font-medium">ROI</th>
                <th className="text-right px-4 py-3 font-medium">$/hr</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.name} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                  <td className="px-4 py-3 text-right">${r.gross.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-600">${r.fees.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-600">${r.adSpend.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-700">${r.net.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-bold">
                    {r.roi !== null ? `${r.roi.toFixed(1)}×` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    {r.rate !== null ? `$${r.rate.toFixed(0)}/hr` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold text-sm">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">${totals.gross.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-red-600" colSpan={2}>${totals.cost.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-green-700">${totals.net.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {totals.cost > 0 ? `${(totals.net / totals.cost).toFixed(1)}×` : '—'}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-800 mb-3">Add ad spend</h3>
        <form action="/api/roi/add-cost" method="post" className="flex gap-3 flex-wrap">
          <select name="streamId" className="border rounded px-3 py-2 text-sm">
            {streams?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select name="channel" className="border rounded px-3 py-2 text-sm">
            <option value="linkedin">LinkedIn</option>
            <option value="google">Google</option>
            <option value="facebook">Facebook</option>
            <option value="other">Other</option>
          </select>
          <input name="amount" type="number" placeholder="$0.00" className="border rounded px-3 py-2 text-sm w-24" />
          <input name="period_start" type="date" className="border rounded px-3 py-2 text-sm" />
          <input name="period_end" type="date" className="border rounded px-3 py-2 text-sm" />
          <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium">Save</button>
        </form>
      </div>
    </div>
  )
}
