'use client'

import { useState } from 'react'
import Link from 'next/link'

const PLATFORMS = [
  { name: 'Upwork', fee: 10 },
  { name: 'Fiverr', fee: 20 },
  { name: 'Etsy', fee: 6.5 },
  { name: 'Gumroad', fee: 10 },
  { name: 'DoorDash', fee: 0 },
  { name: 'Uber / Lyft', fee: 25 },
  { name: 'TaskRabbit', fee: 15 },
  { name: 'Direct clients', fee: 0 },
  { name: 'Shopify', fee: 2.9 },
  { name: 'Other', fee: 0 },
]

function getVerdict(trueRate: number, goal: number): { emoji: string; text: string; color: string } {
  const pct = goal > 0 ? trueRate / goal : 1
  if (pct >= 1.2) return { emoji: '🚀', text: 'Excellent — this stream beats your goal!', color: 'text-green-700 bg-green-50 border-green-200' }
  if (pct >= 0.9) return { emoji: '✅', text: 'On track — close to your target hourly rate.', color: 'text-blue-700 bg-blue-50 border-blue-200' }
  if (pct >= 0.6) return { emoji: '⚠️', text: 'Below target — consider raising rates or reducing admin time.', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' }
  return { emoji: '🚨', text: "This stream isn't worth the time at current rates — time to reprice or cut it.", color: 'text-red-700 bg-red-50 border-red-200' }
}

export default function CalculatorForm() {
  const [platform, setPlatform] = useState('Upwork')
  const [revenue, setRevenue] = useState('')
  const [fee, setFee] = useState('10')
  const [hours, setHours] = useState('')
  const [adSpend, setAdSpend] = useState('')
  const [goal, setGoal] = useState('')
  const [result, setResult] = useState<null | {
    trueRate: number
    netEarnings: number
    platformFeeAmount: number
    adSpendAmount: number
    gap: number
    verdict: ReturnType<typeof getVerdict>
  }>(null)

  function handlePlatformChange(name: string) {
    setPlatform(name)
    const p = PLATFORMS.find(p => p.name === name)
    if (p) setFee(String(p.fee))
  }

  function calculate(e: React.FormEvent) {
    e.preventDefault()
    const rev = parseFloat(revenue) || 0
    const feeP = parseFloat(fee) || 0
    const hrs = parseFloat(hours) || 1
    const ads = parseFloat(adSpend) || 0
    const goalRate = parseFloat(goal) || 50

    const platformFeeAmount = rev * (feeP / 100)
    const netEarnings = rev - platformFeeAmount - ads
    const trueRate = netEarnings / hrs
    const gap = ((trueRate - goalRate) / goalRate) * 100

    setResult({
      trueRate,
      netEarnings,
      platformFeeAmount,
      adSpendAmount: ads,
      gap,
      verdict: getVerdict(trueRate, goalRate),
    })
    // Scroll to result
    setTimeout(() => {
      document.getElementById('calc-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={calculate} className="space-y-5">
        {/* Platform */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
          <select
            value={platform}
            onChange={e => handlePlatformChange(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
          >
            {PLATFORMS.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Revenue + Fee */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Monthly gross revenue ($)
            </label>
            <input
              type="number"
              required
              min="0"
              value={revenue}
              onChange={e => setRevenue(e.target.value)}
              placeholder="e.g. 3000"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Platform fee % <span className="text-gray-400">(auto-filled)</span>
            </label>
            <input
              type="number"
              required
              min="0"
              max="100"
              step="0.1"
              value={fee}
              onChange={e => setFee(e.target.value)}
              placeholder="e.g. 10"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Hours + Ad spend */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Monthly hours <span className="text-gray-400">(incl. admin, proposals)</span>
            </label>
            <input
              type="number"
              required
              min="0.5"
              step="0.5"
              value={hours}
              onChange={e => setHours(e.target.value)}
              placeholder="e.g. 40"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Monthly ad spend ($) <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="number"
              min="0"
              value={adSpend}
              onChange={e => setAdSpend(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Goal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Your target hourly rate ($)
          </label>
          <input
            type="number"
            required
            min="1"
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="e.g. 50"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl text-base transition-colors shadow-sm"
        >
          Calculate my true hourly rate →
        </button>
      </form>

      {/* Result */}
      {result && (
        <div id="calc-result" className="mt-10 animate-fade-in">
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-4">Your Results — {platform}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">${result.trueRate.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">True hourly rate</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">${result.netEarnings.toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">Net monthly earnings</p>
              </div>
              <div className={`bg-white rounded-xl border border-gray-100 p-4 text-center col-span-2 sm:col-span-1`}>
                <p className={`text-2xl font-bold ${result.gap >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {result.gap >= 0 ? '+' : ''}{result.gap.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">vs. your goal</p>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="text-sm text-gray-600 space-y-1.5 mb-5 border-t border-gray-100 pt-4">
              <div className="flex justify-between">
                <span>Gross revenue</span>
                <span className="font-medium text-gray-800">${parseFloat(revenue).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>Platform fees ({fee}%)</span>
                <span>−${result.platformFeeAmount.toFixed(0)}</span>
              </div>
              {result.adSpendAmount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Ad spend</span>
                  <span>−${result.adSpendAmount.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-2 mt-2">
                <span>Net earnings</span>
                <span>${result.netEarnings.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-blue-600 font-bold">
                <span>True hourly rate</span>
                <span>${result.trueRate.toFixed(2)}/hr</span>
              </div>
            </div>

            {/* Verdict */}
            <div className={`rounded-xl border p-4 ${result.verdict.color}`}>
              <p className="font-semibold text-sm">{result.verdict.emoji} {result.verdict.text}</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 text-center">
            <p className="font-bold text-gray-800 mb-1">Running multiple streams?</p>
            <p className="text-sm text-gray-500 mb-4">See which one actually wins. Get a free multi-stream analysis — no account needed.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/free-audit?utm_source=calculator&utm_medium=cta"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
              >
                Get your full multi-stream analysis free →
              </Link>
              <Link
                href="/signup?utm_source=calculator&utm_medium=cta"
                className="border border-gray-200 text-gray-700 hover:bg-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
              >
                Sign up free to track all streams
              </Link>
            </div>
            <p className="text-xs text-gray-400 mt-3">Based on data from 150+ multi-stream freelancers · No spam · Cancel anytime</p>
          </div>
        </div>
      )}
    </div>
  )
}
