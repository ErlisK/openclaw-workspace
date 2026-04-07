'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'

interface SweepPoint {
  price: number
  notCheap: number
  notExpensive: number
  cheap: number
  expensive: number
}

interface Props {
  sweep: SweepPoint[]
  opp: number
  ipp: number
  aprLo: number
  aprHi: number
  currentPrice: number
}

export default function PriceResearchCharts({ sweep, opp, ipp, aprLo, aprHi, currentPrice }: Props) {
  // Downsample to every $2 for cleaner chart
  const data = sweep.filter(pt => pt.price % 2 === 0 || pt.price === opp || pt.price === ipp || pt.price === currentPrice)

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="font-semibold mb-1">Van Westendorp Curves</h3>
      <p className="text-xs text-gray-500 mb-5">
        Cumulative % of respondents · OPP (${opp}) = green lines cross · IPP (${ipp}) = orange lines cross · APR = shaded ${aprLo}–${aprHi}
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="price"
            tickFormatter={v => `$${v}`}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <YAxis
            tickFormatter={v => `${v}%`}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            labelFormatter={v => `$${v}/mo`}
            formatter={(v: unknown) => [`${(v as number).toFixed(1)}%`]}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />

          {/* APR shading via two reference lines */}
          <ReferenceLine x={aprLo} stroke="rgba(251,146,60,0.3)" strokeDasharray="4 2" label={{ value: `APR $${aprLo}`, fill: '#f97316', fontSize: 10, position: 'insideTopRight' }} />
          <ReferenceLine x={aprHi} stroke="rgba(251,146,60,0.3)" strokeDasharray="4 2" label={{ value: `APR $${aprHi}`, fill: '#f97316', fontSize: 10, position: 'insideTopLeft' }} />
          <ReferenceLine x={opp} stroke="rgba(52,211,153,0.6)" strokeWidth={2} label={{ value: `OPP $${opp}`, fill: '#34d399', fontSize: 10, position: 'top' }} />
          <ReferenceLine x={ipp} stroke="rgba(251,191,36,0.6)" strokeWidth={2} label={{ value: `IPP $${ipp}`, fill: '#fbbf24', fontSize: 10, position: 'top' }} />
          <ReferenceLine x={currentPrice} stroke="rgba(239,68,68,0.7)" strokeWidth={2} strokeDasharray="6 2" label={{ value: `Current $${currentPrice}`, fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />

          <Line type="monotone" dataKey="notCheap" name="Not too cheap" stroke="#34d399" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="notExpensive" name="Not expensive" stroke="#60a5fa" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="cheap" name="Cheap (bargain)" stroke="#fbbf24" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="expensive" name="Expensive" stroke="#f87171" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
