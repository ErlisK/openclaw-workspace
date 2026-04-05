"use client";
import { useState } from "react";
import Link from "next/link";
import type { RiskIndexReport } from "@/lib/change-risk-index";

const CATEGORY_EMOJI: Record<string, string> = {
  pricing: "💰", legal: "⚖️", security: "🔒", operational: "⚙️",
};

const RISK_COLORS: Record<string, { bar: string; bg: string; text: string }> = {
  high:   { bar: "bg-red-500",    bg: "bg-red-50",    text: "text-red-700"    },
  medium: { bar: "bg-yellow-500", bg: "bg-yellow-50", text: "text-yellow-700" },
  low:    { bar: "bg-green-500",  bg: "bg-green-50",  text: "text-green-700"  },
};

export default function RiskIndexReportClient({ report }: { report: RiskIndexReport }) {
  const [showGate, setShowGate] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          company,
          source: "change_risk_index",
          asset_slug: "change-risk-index",
        }),
      });
      setSubmitted(true);
    } catch { /* ignore */ }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/change-risk-index" className="hover:text-indigo-600">Risk Index</Link>
            <span>›</span>
            <span className="text-gray-800 font-medium">{report.month_label}</span>
          </div>
          <Link
            href="/auth/signup"
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Get Real-Time Alerts →
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            {report.month_label} — SaaS Change Risk Report
          </h1>
          <p className="text-gray-600 text-lg">{report.summary}</p>
          <p className="text-xs text-gray-400 mt-2">
            Generated {new Date(report.generated_at).toLocaleString()} · {report.total_changes} changes analyzed
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Changes", value: report.total_changes, color: "text-gray-900" },
            { label: "High Severity", value: report.high_risk_count, color: "text-red-600" },
            { label: "Medium Severity", value: report.medium_risk_count, color: "text-yellow-600" },
            { label: "Vendors Monitored", value: report.top_vendors.length, color: "text-indigo-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Key findings */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🔑</span> Key Findings
          </h2>
          <ul className="space-y-2">
            {report.key_findings.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-amber-500 mt-0.5 shrink-0">▸</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Vendor risk leaderboard */}
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">🏆 Vendor Risk Leaderboard</h2>
            <p className="text-sm text-gray-500 mt-0.5">Risk score 0–100 based on change volume, severity, and category</p>
          </div>
          <div className="divide-y divide-gray-100">
            {report.top_vendors.slice(0, 8).map((vendor, i) => (
              <div key={vendor.vendor_slug} className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-gray-300 w-6">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900">{vendor.vendor_display}</span>
                      <div className="flex items-center gap-2">
                        {vendor.risk_delta !== 0 && (
                          <span className={`text-xs ${vendor.risk_delta > 0 ? "text-red-500" : "text-green-500"}`}>
                            {vendor.risk_delta > 0 ? "↑" : "↓"}{Math.abs(vendor.risk_delta)}
                          </span>
                        )}
                        <span className="text-sm font-bold text-gray-700">{vendor.risk_score}/100</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${vendor.risk_score >= 70 ? "bg-red-500" : vendor.risk_score >= 40 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${vendor.risk_score}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="text-red-500 font-medium">{vendor.high_risk} high</span>
                      <span className="text-yellow-500 font-medium">{vendor.medium_risk} medium</span>
                      <span className="text-gray-400">{vendor.low_risk} low</span>
                      <span className="text-gray-300">·</span>
                      <span className="truncate max-w-[300px]">{vendor.top_change}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="font-bold text-gray-900 mb-4">📊 By Risk Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(report.category_breakdown).map(([cat, count]) => (
              <div key={cat} className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-2xl mb-1">{CATEGORY_EMOJI[cat] ?? "📋"}</div>
                <div className="text-2xl font-bold text-gray-900">{count as number}</div>
                <div className="text-xs text-gray-500 capitalize">{cat}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Email gate for PDF / subscription */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-8 text-white">
          {submitted ? (
            <div className="text-center">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-2xl font-bold mb-2">You&apos;re subscribed!</h2>
              <p className="text-indigo-100 text-sm mb-4">
                We&apos;ll send you the {report.month_label} report and future monthly issues.
              </p>
              <Link
                href="/auth/signup"
                className="inline-block px-6 py-2.5 bg-white text-indigo-700 rounded-lg font-semibold text-sm hover:bg-indigo-50"
              >
                Start Free Trial — Real-Time Alerts →
              </Link>
            </div>
          ) : showGate ? (
            <form onSubmit={handleSubmit}>
              <h2 className="text-xl font-bold mb-4">Get This Report + Monthly Updates</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Work email *"
                  className="px-4 py-2.5 rounded-lg text-gray-900 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="px-4 py-2.5 rounded-lg text-gray-900 text-sm outline-none"
                />
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Company"
                  className="px-4 py-2.5 rounded-lg text-gray-900 text-sm outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-2.5 bg-white text-indigo-700 rounded-lg font-semibold text-sm hover:bg-indigo-50 disabled:opacity-50"
              >
                {submitting ? "Subscribing…" : "Subscribe & Get Report →"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold mb-1">Subscribe for Future Issues</h2>
                <p className="text-indigo-100 text-sm">Monthly report + breaking alerts when high-risk changes are detected.</p>
              </div>
              <button
                onClick={() => setShowGate(true)}
                className="px-8 py-3 bg-white text-indigo-700 rounded-lg font-semibold text-sm hover:bg-indigo-50 whitespace-nowrap"
              >
                Get Free Reports →
              </button>
            </div>
          )}
        </div>

        {/* Methodology */}
        <details className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <summary className="font-semibold text-gray-700 cursor-pointer">📐 Methodology</summary>
          <p className="mt-4 text-sm text-gray-600 leading-relaxed">{report.methodology}</p>
        </details>

        <div className="mt-8 text-center text-sm text-gray-500">
          <Link href="/change-risk-index" className="hover:text-indigo-600">← Back to Index Archive</Link>
          {" · "}
          <Link href="/playbooks" className="hover:text-indigo-600">Integration Playbooks</Link>
          {" · "}
          <Link href="/auth/signup" className="text-indigo-600 hover:underline">Start Free Trial</Link>
        </div>
      </div>
    </div>
  );
}
