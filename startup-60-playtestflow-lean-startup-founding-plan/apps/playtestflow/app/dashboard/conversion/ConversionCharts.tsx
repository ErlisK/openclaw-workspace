'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar,
} from 'recharts'

interface TimeSeriesPoint {
  date: string
  trial_start?: number
  trial_activated?: number
  paid_conversion?: number
  paid_first_value?: number
  [key: string]: string | number | undefined
}

export default function ConversionCharts({ timeSeries }: { timeSeries: TimeSeriesPoint[] }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="font-semibold mb-1">Events Over Time</h3>
      <p className="text-xs text-gray-500 mb-5">Daily conversion events — last 30 days</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={timeSeries} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="trial_start" name="Trial Start" fill="#60a5fa" radius={[2,2,0,0]} />
          <Bar dataKey="trial_activated" name="Activated" fill="#fb923c" radius={[2,2,0,0]} />
          <Bar dataKey="paid_conversion" name="Paid Conversion" fill="#4ade80" radius={[2,2,0,0]} />
          <Bar dataKey="paid_first_value" name="First Value" fill="#a78bfa" radius={[2,2,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
