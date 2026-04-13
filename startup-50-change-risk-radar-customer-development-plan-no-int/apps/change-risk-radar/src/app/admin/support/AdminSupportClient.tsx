"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { INCIDENT_COMMS_TEMPLATES } from "@/lib/help-center";
import type { SupportTicket, ComponentStatus } from "@/lib/help-center";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  waiting_on_customer: "bg-orange-100 text-orange-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-600 font-bold",
  high: "text-orange-600 font-semibold",
  normal: "text-blue-600",
  low: "text-gray-500",
};

type TabId = "tickets" | "status" | "comms";

export default function AdminSupportClient() {
  const [tab, setTab] = useState<TabId>("tickets");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [counts, setCounts] = useState({ open: 0, in_progress: 0, resolved: 0, urgent: 0 });
  const [statusData, setStatusData] = useState<{ components?: { id: string; name: string; slug: string; status: string; label: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const secret = "crr-portal-2025";

  // Create incident form
  const [incidentForm, setIncidentForm] = useState({
    title: "",
    status: "investigating",
    impact: "minor",
    affected_components: [] as string[],
    body_text: "",
    send_comms: false,
    comms_template: "incident.investigating.email",
    comms_recipients: "",
  });
  const [incidentResult, setIncidentResult] = useState<string | null>(null);

  // Comms preview
  const [commsCtx, setCommsCtx] = useState({
    incident_title: "Elevated API Latency",
    affected_components: ["api", "alert-engine"],
    impact: "minor" as "none" | "minor" | "major" | "critical",
    started_at: new Date().toISOString(),
    incident_url: "https://change-risk-radar.vercel.app/status",
    body: "We are investigating elevated latency on the API. Some webhook events may be delayed.",
    incident_status: "investigating" as "investigating" | "identified" | "monitoring" | "resolved" | "scheduled",
    resolved_at: undefined as string | undefined,
    next_update: undefined as string | undefined,
  });
  const [selectedTemplate, setSelectedTemplate] = useState("incident.investigating.email");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [ticketRes, statusRes] = await Promise.all([
          fetch(`/api/support/tickets?secret=${secret}`),
          fetch(`/api/status`),
        ]);
        const ticketData = await ticketRes.json();
        const statusJson = await statusRes.json();
        setTickets(ticketData.tickets ?? []);
        setCounts(ticketData.counts ?? {});
        setStatusData(statusJson);
      } catch { /* ignore */ }
      setLoading(false);
    };
    run();
  }, []);

  async function handleCreateIncident() {
    const recipients = incidentForm.comms_recipients
      .split(",")
      .map(e => e.trim())
      .filter(Boolean);

    const res = await fetch(`/api/status?secret=${secret}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...incidentForm,
        send_comms: incidentForm.send_comms,
        comms_recipients: recipients,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setIncidentResult(`Incident created: ${data.incident?.id}`);
    } else {
      setIncidentResult(`Error: ${data.error}`);
    }
  }

  async function updateComponent(slug: string, status: ComponentStatus) {
    await fetch(`/api/status?secret=${secret}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_component", component_slug: slug, component_status: status }),
    });
    // Refresh
    const res = await fetch("/api/status");
    setStatusData(await res.json());
  }

  const templateList = Object.entries(INCIDENT_COMMS_TEMPLATES);
  const selectedTmpl = INCIDENT_COMMS_TEMPLATES[selectedTemplate];
  const previewBody = selectedTmpl ? selectedTmpl.getBody(commsCtx) : "";

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: "tickets", label: "📋 Tickets", badge: counts.open },
    { id: "status", label: "🟢 Status Page" },
    { id: "comms", label: "📣 Incident Comms" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Admin</h1>
            <p className="text-sm text-gray-500 mt-0.5">Tickets · Status · Incident Communications</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/status" className="text-indigo-600 hover:underline">Public Status ↗</Link>
            <Link href="/help" className="text-indigo-600 hover:underline">Help Center ↗</Link>
            <Link href="/admin/metrics" className="text-gray-600 hover:underline">Metrics</Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Open Tickets", value: counts.open, color: "text-blue-600" },
            { label: "In Progress", value: counts.in_progress, color: "text-yellow-600" },
            { label: "Resolved", value: counts.resolved, color: "text-green-600" },
            { label: "Urgent", value: counts.urgent, color: "text-red-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                tab === t.id ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:border-indigo-300"
              }`}
            >
              {t.label}
              {t.badge ? (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ── Tickets Tab ── */}
        {tab === "tickets" && (
          <div>
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading tickets…</div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Ticket", "Subject", "Category", "Priority", "Status", "Created", ""].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tickets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-gray-400">
                          No tickets yet — <Link href="/support/new" className="text-indigo-600 hover:underline">create test ticket</Link>
                        </td>
                      </tr>
                    ) : tickets.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{t.ticket_number}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{t.subject}</td>
                        <td className="px-4 py-3 capitalize text-gray-600">{t.category.replace("_", " ")}</td>
                        <td className={`px-4 py-3 capitalize ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-100"}`}>
                            {t.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <Link href={`/support/${t.id}`} className="text-indigo-600 hover:underline text-xs">View →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Status Tab ── */}
        {tab === "status" && (
          <div className="space-y-6">
            {/* Components */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">System Components</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {(statusData?.components ?? []).map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{c.slug}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{c.label}</span>
                      <select
                        value={c.status}
                        onChange={e => updateComponent(c.slug, e.target.value as ComponentStatus)}
                        className="text-xs border border-gray-200 rounded px-2 py-1"
                      >
                        <option value="operational">Operational</option>
                        <option value="degraded_performance">Degraded</option>
                        <option value="partial_outage">Partial Outage</option>
                        <option value="major_outage">Major Outage</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create Incident form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Create Incident</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Incident title"
                  value={incidentForm.title}
                  onChange={e => setIncidentForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={incidentForm.status}
                    onChange={e => setIncidentForm(f => ({ ...f, status: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    {["investigating","identified","monitoring","resolved","scheduled"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    value={incidentForm.impact}
                    onChange={e => setIncidentForm(f => ({ ...f, impact: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    {["none","minor","major","critical"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  rows={3}
                  placeholder="Incident description for public status page"
                  value={incidentForm.body_text}
                  onChange={e => setIncidentForm(f => ({ ...f, body_text: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={incidentForm.send_comms}
                      onChange={e => setIncidentForm(f => ({ ...f, send_comms: e.target.checked }))}
                    />
                    Send email notification
                  </label>
                  {incidentForm.send_comms && (
                    <input
                      type="text"
                      placeholder="Recipients (comma-separated)"
                      value={incidentForm.comms_recipients}
                      onChange={e => setIncidentForm(f => ({ ...f, comms_recipients: e.target.value }))}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleCreateIncident}
                    className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
                  >
                    🚨 Create Incident
                  </button>
                  {incidentResult && <p className="text-sm text-gray-600">{incidentResult}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Comms Tab ── */}
        {tab === "comms" && (
          <div className="grid grid-cols-2 gap-6">
            {/* Template selector + context */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Incident Comms Templates</h2>
                <div className="space-y-2">
                  {templateList.map(([key, tmpl]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedTemplate(key)}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                        selectedTemplate === key
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-gray-200 hover:border-indigo-200"
                      }`}
                    >
                      <div className="font-medium text-gray-800">{tmpl.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{tmpl.channel} · {tmpl.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Preview Context</h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Incident title"
                    value={commsCtx.incident_title}
                    onChange={e => setCommsCtx(c => ({ ...c, incident_title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <textarea
                    rows={3}
                    placeholder="Incident body"
                    value={commsCtx.body}
                    onChange={e => setCommsCtx(c => ({ ...c, body: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-1">{selectedTmpl?.label ?? "Preview"}</h2>
              <p className="text-xs text-gray-500 mb-4">{selectedTmpl?.description}</p>
              <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono text-gray-700 whitespace-pre-wrap border border-gray-200 max-h-96 overflow-y-auto">
                {previewBody || "Select a template to preview"}
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(previewBody)}
                className="mt-3 px-4 py-2 text-xs bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                📋 Copy to clipboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
