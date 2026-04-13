import { Metadata } from "next";
import Link from "next/link";
import {
  getStatusComponents,
  getActiveIncidents,
  getRecentIncidents,
  getOverallStatus,
  STATUS_LABELS,
  IMPACT_LABELS,
  type StatusComponent,
  type StatusIncident,
} from "@/lib/help-center";

export const metadata: Metadata = {
  title: "System Status — Change Risk Radar",
  description: "Real-time status of all Change Risk Radar services.",
};

export const dynamic = "force-dynamic";

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    operational: "bg-green-500",
    degraded_performance: "bg-yellow-500",
    partial_outage: "bg-orange-500",
    major_outage: "bg-red-500",
    maintenance: "bg-blue-500",
  };
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status] ?? "bg-gray-400"}`} />
  );
}

function IncidentCard({ incident }: { incident: StatusIncident }) {
  const isResolved = incident.status === "resolved";
  const impact = IMPACT_LABELS[incident.impact];

  return (
    <div className={`border rounded-xl p-5 ${isResolved ? "bg-gray-50 border-gray-200" : "bg-orange-50 border-orange-200"}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="font-semibold text-gray-900">{incident.title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-semibold uppercase ${impact.color}`}>
            {impact.label} impact
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isResolved ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
          }`}>
            {incident.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {incident.affected_components.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {incident.affected_components.map(c => (
            <span key={c} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{c}</span>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-700 mb-3">{incident.body}</p>

      {incident.updates && incident.updates.length > 1 && (
        <div className="mt-4 space-y-2 border-t border-gray-200 pt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Updates</p>
          {incident.updates.slice(0, 3).map(u => (
            <div key={u.id} className="text-xs text-gray-600">
              <span className="font-medium capitalize">{u.status}</span>
              {" — "}
              {u.body}
              <span className="text-gray-400 ml-1">
                {new Date(u.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Started {new Date(incident.created_at).toLocaleString()}
        {incident.resolved_at && ` · Resolved ${new Date(incident.resolved_at).toLocaleString()}`}
      </p>
    </div>
  );
}

export default async function StatusPage() {
  const [components, activeIncidents, recentIncidents] = await Promise.all([
    getStatusComponents(),
    getActiveIncidents(),
    getRecentIncidents(30),
  ]);

  const overallStatus = await getOverallStatus(components);
  const overallLabel = STATUS_LABELS[overallStatus];

  const pastIncidents = recentIncidents.filter(
    i => i.status === "resolved" && !activeIncidents.find(a => a.id === i.id)
  );

  const overallColors: Record<string, string> = {
    operational: "from-green-600 to-green-500",
    degraded_performance: "from-yellow-600 to-yellow-500",
    partial_outage: "from-orange-600 to-orange-500",
    major_outage: "from-red-700 to-red-500",
    maintenance: "from-blue-600 to-blue-500",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Overall status banner */}
      <div className={`bg-gradient-to-r ${overallColors[overallStatus] ?? "from-green-600 to-green-500"} text-white py-16 px-6 text-center`}>
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4">
            {overallStatus === "operational" ? "✅" :
             overallStatus === "major_outage" ? "🔴" :
             overallStatus === "maintenance" ? "🔧" : "⚠️"}
          </div>
          <h1 className="text-3xl font-bold mb-2">{overallLabel.label}</h1>
          <p className="text-green-100 text-sm">
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {/* Active incidents */}
        {activeIncidents.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
              Active Incidents ({activeIncidents.length})
            </h2>
            <div className="space-y-4">
              {activeIncidents.map(i => (
                <IncidentCard key={i.id} incident={i} />
              ))}
            </div>
          </section>
        )}

        {/* Component status */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Components</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {components.map(c => {
              const label = STATUS_LABELS[c.status as keyof typeof STATUS_LABELS];
              return (
                <div key={c.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{c.name}</p>
                    {c.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusDot status={c.status} />
                    <span className={`text-sm font-medium ${label.color}`}>{label.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Past incidents */}
        {pastIncidents.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Past Incidents (30 days)</h2>
            <div className="space-y-4">
              {pastIncidents.slice(0, 5).map(i => (
                <IncidentCard key={i.id} incident={i} />
              ))}
            </div>
          </section>
        )}

        {pastIncidents.length === 0 && activeIncidents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-medium">No incidents in the past 30 days</p>
          </div>
        )}

        {/* Subscribe / links */}
        <div className="bg-gray-100 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-800">Subscribe to Status Updates</p>
            <p className="text-sm text-gray-600">Get notified when incidents occur or are resolved.</p>
          </div>
          <Link
            href="/support/new?category=general&subject=Subscribe+to+status+updates"
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            Subscribe
          </Link>
        </div>

        <div className="text-center text-sm text-gray-500">
          <Link href="/help" className="hover:text-indigo-600">Help Center</Link>
          {" · "}
          <Link href="/support/new" className="hover:text-indigo-600">Contact Support</Link>
          {" · "}
          <Link href="/" className="hover:text-indigo-600">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
