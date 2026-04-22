'use client'

interface TaxEstimateWidgetProps {
  monthlyNetRevenue: number
}

function getNextQuarterlyDue(): string {
  const now = new Date()
  const year = now.getFullYear()
  const dates = [
    new Date(year, 3, 15),      // Apr 15
    new Date(year, 5, 15),      // Jun 15
    new Date(year, 8, 15),      // Sep 15
    new Date(year + 1, 0, 15),  // Jan 15
  ]
  const next = dates.find(d => d > now) ?? dates[dates.length - 1]
  return next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function TaxEstimateWidget({ monthlyNetRevenue }: TaxEstimateWidgetProps) {
  if (monthlyNetRevenue <= 400) return null // below SE tax threshold

  const annualized = monthlyNetRevenue * 12
  // Self-employment tax: 15.3% on 92.35% of net SE income
  const seTaxAnnual = annualized * 0.9235 * 0.153
  // Estimated income tax: ~22% bracket rough estimate
  const incomeTaxAnnual = annualized * 0.22
  const totalAnnual = seTaxAnnual + incomeTaxAnnual
  const quarterly = totalAnnual / 4
  const setAsidePercent = Math.round((totalAnnual / annualized) * 100)

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString()

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">🧾</div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-amber-900 text-sm">Estimated Quarterly Tax</h3>
            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
              Estimate only
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-white border border-amber-100 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-amber-800">{fmt(quarterly)}</div>
              <div className="text-xs text-amber-600 mt-0.5">Due quarterly</div>
            </div>
            <div className="bg-white border border-amber-100 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-amber-800">{fmt(seTaxAnnual / 4)}</div>
              <div className="text-xs text-amber-600 mt-0.5">SE tax (15.3%)</div>
            </div>
            <div className="bg-white border border-amber-100 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-amber-800">{setAsidePercent}%</div>
              <div className="text-xs text-amber-600 mt-0.5">Set-aside rate</div>
            </div>
          </div>
          <p className="text-xs text-amber-700 mb-1">
            💡 Set aside <strong>{setAsidePercent}% of each payment</strong> for taxes.
            Next estimated payment due: <strong>{getNextQuarterlyDue()}</strong>.
          </p>
          <p className="text-xs text-amber-500">
            ⚠️ US estimate only — not tax advice. Based on self-employment tax + ~22% income bracket assumption.
            Consult a tax professional for your situation.
          </p>
        </div>
      </div>
    </div>
  )
}
