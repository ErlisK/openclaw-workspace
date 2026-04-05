"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { PartnerDashboardData, PartnerOpportunity } from "@/lib/partner-portal";
import { TIER_COLORS, STAGE_COLORS } from "@/lib/partner-portal";

const STAGES = ["referred","contacted","demo","trial","negotiating","closed_won","closed_lost"];

export default function PartnerPortalClient({ token }: { token: string }) {
  const [data, setData] = useState<PartnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"dashboard"|"opportunities"|"links"|"resources">("dashboard");

  // Add opportunity form
  const [showAddOpp, setShowAddOpp] = useState(false);
  const [oppForm, setOppForm] = useState({
    prospect_email: "", prospect_name: "", prospect_company: "",
    stage: "referred", est_arr: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/partners/portal?token=${token}`);
      if (!res.ok) throw new Error(await res.text());
      const d = await res.json();
      setData(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  async function handleAddOpp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`/api/partners/portal?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_opportunity",
          ...oppForm,
          est_arr: oppForm.est_arr ? parseInt(oppForm.est_arr) : undefined,
        }),
      });
      setShowAddOpp(false);
      setOppForm({ prospect_email: "", prospect_name: "", prospect_company: "", stage: "referred", est_arr: "", notes: "" });
      await loadDashboard();
    } catch { /* ignore */ }
    setSubmitting(false);
  }

  async function updateStage(opp: PartnerOpportunity, stage: string) {
    await fetch(`/api/partners/portal?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_stage", opportunity_id: opp.id, stage }),
    });
    await loadDashboard();
  }

  function copyReferralLink() {
    if (!data) return;
    navigator.clipboard?.writeText(`https://change-risk-radar.vercel.app/partners/${data.partner.referral_code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Loading your partner dashboard…</div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md text-center">
        <div className="text-4xl mb-3">🔒</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Partner Link</h1>
        <p className="text-gray-600 text-sm mb-4">This portal link is invalid or has expired. Contact your partner manager.</p>
        <Link href="/partners" className="text-indigo-600 hover:underline text-sm">Back to Partner Program →</Link>
      </div>
    </div>
  );

  const { partner, opportunities, clicks, pipeline_value, closed_arr, estimated_commission, recent_activity, tier_progress } = data;
  const tierStyle = TIER_COLORS[partner.tier] ?? TIER_COLORS.standard;
  const referralLink = `https://change-risk-radar.vercel.app/partners/${partner.referral_code}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-gray-900 text-lg">Change Risk Radar</Link>
            <span className="text-gray-300">·</span>
            <span className="text-gray-600 text-sm">Partner Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${tierStyle.bg} ${tierStyle.text} border ${tierStyle.border}`}>
              {partner.tier} Partner
            </span>
            <span className="text-sm text-gray-600">{partner.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Clicks", value: clicks.total.toLocaleString(), sub: `${clicks.this_month} this month`, color: "text-blue-600" },
            { label: "Conversions", value: clicks.converted.toLocaleString(), sub: `${clicks.conversion_rate}% conversion`, color: "text-purple-600" },
            { label: "Pipeline ARR", value: `$${pipeline_value.toLocaleString()}`, sub: `${opportunities.filter(o => !["closed_won","closed_lost"].includes(o.stage)).length} open opps`, color: "text-orange-600" },
            { label: "Est. Commission", value: `$${estimated_commission.toLocaleString()}`, sub: `${partner.commission_pct}% on $${closed_arr.toLocaleString()} closed`, color: "text-green-600" },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className={`text-2xl font-bold ${k.color} mb-1`}>{k.value}</div>
              <div className="text-xs font-medium text-gray-700">{k.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["dashboard","opportunities","links","resources"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:border-indigo-300"
              }`}
            >
              {t === "dashboard" && "📊 "}
              {t === "opportunities" && "🎯 "}
              {t === "links" && "🔗 "}
              {t === "resources" && "📚 "}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Dashboard tab */}
        {tab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-5">
              {/* Tier progress */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">Tier Progress</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tierStyle.bg} ${tierStyle.text} font-semibold capitalize`}>
                    {partner.tier}
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${tier_progress.pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>${tier_progress.current_arr.toLocaleString()} ARR closed</span>
                  <span>${tier_progress.next_tier_arr.toLocaleString()} for {tier_progress.next_tier}</span>
                </div>
              </div>

              {/* Recent activity */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
                {recent_activity.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No activity yet — add your first opportunity below!</p>
                ) : (
                  <div className="space-y-3">
                    {recent_activity.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <span className="text-gray-300 text-xs mt-0.5 w-20 shrink-0">{a.date}</span>
                        <div>
                          <span className="font-medium text-gray-800">{a.action}</span>
                          <span className="text-gray-500 ml-2">{a.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-5">
              {/* Your referral link */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Your Referral Link</h2>
                <code className="block text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 text-indigo-600 break-all mb-3">
                  change-risk-radar.vercel.app/partners/{partner.referral_code}
                </code>
                <button
                  onClick={copyReferralLink}
                  className="w-full text-sm py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {copied ? "✅ Copied!" : "📋 Copy Link"}
                </button>
              </div>

              {/* Partner info */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Partner Info</h2>
                <dl className="space-y-2 text-sm">
                  {[
                    { label: "Code", value: partner.referral_code },
                    { label: "Type", value: partner.partner_type },
                    { label: "Commission", value: `${partner.commission_pct}% recurring` },
                    { label: "Member since", value: partner.created_at.slice(0, 10) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="font-medium text-gray-800 capitalize">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4">
                <p className="text-sm font-semibold text-indigo-800 mb-1">Questions?</p>
                <p className="text-xs text-indigo-600">Email your partner manager at <a href="mailto:partners@change-risk-radar.com" className="underline">partners@change-risk-radar.com</a></p>
              </div>
            </div>
          </div>
        )}

        {/* Opportunities tab */}
        {tab === "opportunities" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Your Pipeline ({opportunities.length})</h2>
              <button
                onClick={() => setShowAddOpp(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                + Add Opportunity
              </button>
            </div>

            {showAddOpp && (
              <form onSubmit={handleAddOpp} className="bg-white rounded-xl border border-indigo-200 p-6 mb-5">
                <h3 className="font-semibold text-gray-900 mb-4">New Opportunity</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <input required type="email" placeholder="Prospect email *" value={oppForm.prospect_email}
                    onChange={e => setOppForm(f => ({ ...f, prospect_email: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input placeholder="Prospect name" value={oppForm.prospect_name}
                    onChange={e => setOppForm(f => ({ ...f, prospect_name: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input placeholder="Company" value={oppForm.prospect_company}
                    onChange={e => setOppForm(f => ({ ...f, prospect_company: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <select value={oppForm.stage} onChange={e => setOppForm(f => ({ ...f, stage: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    {STAGES.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                  </select>
                  <input type="number" placeholder="Est. ARR ($)" value={oppForm.est_arr}
                    onChange={e => setOppForm(f => ({ ...f, est_arr: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input placeholder="Notes (optional)" value={oppForm.notes}
                    onChange={e => setOppForm(f => ({ ...f, notes: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                    {submitting ? "Adding…" : "Add Opportunity"}
                  </button>
                  <button type="button" onClick={() => setShowAddOpp(false)}
                    className="px-5 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:border-gray-300">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {opportunities.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">🎯</p>
                <p className="font-medium">No opportunities yet</p>
                <p className="text-sm mt-1">Add a prospect to start tracking your pipeline</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Prospect","Company","Stage","Est. ARR","Created","Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {opportunities.map(opp => (
                      <tr key={opp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900 font-medium">{opp.prospect_name ?? opp.prospect_email}</td>
                        <td className="px-4 py-3 text-gray-600">{opp.prospect_company ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STAGE_COLORS[opp.stage] ?? "bg-gray-100 text-gray-600"}`}>
                            {opp.stage.replace("_"," ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{opp.est_arr ? `$${opp.est_arr.toLocaleString()}` : "—"}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{opp.created_at.slice(0,10)}</td>
                        <td className="px-4 py-3">
                          <select
                            value={opp.stage}
                            onChange={e => updateStage(opp, e.target.value)}
                            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                          >
                            {STAGES.map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Links tab */}
        {tab === "links" && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Your Tracking Links</h2>
              <div className="space-y-4">
                {[
                  { label: "Main Referral Link", url: referralLink, desc: "Share this link in emails, LinkedIn, blog posts" },
                  { label: "Pricing Page (w/ referral)", url: `https://change-risk-radar.vercel.app/pricing?ref=${partner.referral_code}`, desc: "Send prospects directly to pricing" },
                  { label: "Sales Hub (w/ referral)", url: `https://change-risk-radar.vercel.app/sales?ref=${partner.referral_code}`, desc: "Full sales materials with your referral tag" },
                  { label: "Risk Index (w/ referral)", url: `https://change-risk-radar.vercel.app/change-risk-index?ref=${partner.referral_code}`, desc: "Content marketing asset with your attribution" },
                  { label: "Tracking Pixel", url: `https://change-risk-radar.vercel.app/api/partners/track?ref=${partner.referral_code}&page=email`, desc: "1×1 GIF for email newsletters" },
                ].map(link => (
                  <div key={link.label} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900 text-sm">{link.label}</p>
                      <button
                        onClick={() => { navigator.clipboard?.writeText(link.url); }}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                    <code className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded block truncate">{link.url}</code>
                    <p className="text-xs text-gray-400 mt-1">{link.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Click Analytics</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Total Clicks", value: clicks.total },
                  { label: "This Month", value: clicks.this_month },
                  { label: "Converted", value: `${clicks.converted} (${clicks.conversion_rate}%)` },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Resources tab */}
        {tab === "resources" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { title: "Sales Playbook", desc: "Full ICP, qualification framework, objection handling, and demo scenarios", href: "/sales", emoji: "📋" },
              { title: "Pricing Page", desc: "Current plan pricing — Starter $500/mo, Growth $1,500/mo", href: "/pricing", emoji: "💳" },
              { title: "Security & Compliance Pack", desc: "For security-conscious prospects: data flow diagrams, RBAC, DPA", href: "/pilot/security", emoji: "🔒" },
              { title: "Pilot SOW Template", desc: "90-day pilot agreement template for enterprise deals", href: "/pilot/sow", emoji: "📝" },
              { title: "Integration Playbooks", desc: "Technical guides for Stripe, AWS, Shopify, Salesforce, Workspace", href: "/playbooks", emoji: "🔌" },
              { title: "Monthly Risk Index", desc: "Content marketing asset — SaaS Change Risk scores for 28+ vendors", href: "/change-risk-index", emoji: "📊" },
              { title: "Help Center", desc: "Full product documentation for customer onboarding", href: "/help", emoji: "📚" },
              { title: "System Status", desc: "Real-time service uptime for customer-facing use", href: "/status", emoji: "🟢" },
            ].map(r => (
              <a
                key={r.title}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <span className="text-3xl">{r.emoji}</span>
                <div>
                  <p className="font-semibold text-gray-900">{r.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{r.desc}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
