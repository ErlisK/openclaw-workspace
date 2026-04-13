import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getFile, todayPath } from "@/lib/github";

export const dynamic = "force-dynamic";

interface LeadRecord {
  full_name: string;
  email: string;
  organization?: string | null;
  use_case?: string | null;
  needs_compliance_review?: boolean;
  utm?: { source?: string; medium?: string; campaign?: string };
  referrer?: string;
  session_id: string;
  timestamp: string;
}

interface EventRecord {
  type: string;
  pathname: string;
  session_id: string;
  utm?: { source?: string; campaign?: string };
  referrer?: string;
  timestamp: string;
}

function parseJsonl<T>(content: string): T[] {
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as T;
      } catch {
        return null;
      }
    })
    .filter((x): x is T => x !== null);
}

async function loadTodayData() {
  const [eventsFile, leadsFile] = await Promise.all([
    getFile(todayPath("events", "events")),
    getFile(todayPath("leads", "leads")),
  ]);
  const events = eventsFile ? parseJsonl<EventRecord>(eventsFile.content) : [];
  const leads = leadsFile ? parseJsonl<LeadRecord>(leadsFile.content) : [];
  return { events, leads };
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  if (!session || session.value !== "1") {
    redirect("/login?next=/admin");
  }

  const { events, leads } = await loadTodayData();

  const pageviews = events.filter((e) => e.type === "pageview").length;
  const allSessions = new Set([
    ...events.map((e) => e.session_id),
    ...leads.map((l) => l.session_id),
  ]);
  const uniqueSessions = allSessions.size;
  const conversionRate =
    uniqueSessions > 0 ? ((leads.length / uniqueSessions) * 100).toFixed(1) : "0.0";

  const utmSourceCounts: Record<string, number> = {};
  [...events, ...leads].forEach((item) => {
    const src =
      (item as EventRecord).utm?.source || (item as LeadRecord).utm?.source;
    if (src) utmSourceCounts[src] = (utmSourceCounts[src] || 0) + 1;
  });

  const refCounts: Record<string, number> = {};
  [...events, ...leads].forEach((item) => {
    const ref = (item as EventRecord).referrer;
    if (ref && ref.length > 0) refCounts[ref] = (refCounts[ref] || 0) + 1;
  });

  const topUtm = Object.entries(utmSourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topRef = Object.entries(refCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const last20Leads = leads.slice(-20).reverse();

  const today = new Date().toISOString().slice(0, 10);
  const eventsPath = `data/claimcheck-studio/events/events-${today}.jsonl`;
  const leadsPath = `data/claimcheck-studio/leads/leads-${today}.jsonl`;
  const leadsJson = JSON.stringify(last20Leads, null, 2);
  const leadsCsv = [
    "timestamp,full_name,email,organization,use_case,needs_compliance_review,utm_source,referrer",
    ...last20Leads.map((l) =>
      [
        l.timestamp,
        l.full_name,
        l.email,
        l.organization || "",
        l.use_case || "",
        l.needs_compliance_review ? "yes" : "no",
        l.utm?.source || "",
        l.referrer || "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 900,
        margin: "0 auto",
        padding: "2rem",
      }}
    >
      <h1 style={{ color: "#1a1a2e" }}>ClaimCheck Studio — Admin</h1>
      <p style={{ color: "#666" }}>
        Today: {today} ·{" "}
        <a href="/" style={{ color: "#4f46e5" }}>
          ← Site
        </a>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          margin: "2rem 0",
        }}
      >
        {[
          { label: "Pageviews", value: pageviews },
          { label: "Unique Sessions", value: uniqueSessions },
          { label: "Lead Submissions", value: leads.length },
          { label: "Conversion Rate", value: `${conversionRate}%` },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: "#f8f9ff",
              borderRadius: 8,
              padding: "1.5rem",
              textAlign: "center",
              border: "1px solid #e0e7ff",
            }}
          >
            <div
              style={{ fontSize: "2rem", fontWeight: "bold", color: "#4f46e5" }}
            >
              {value}
            </div>
            <div style={{ color: "#666", fontSize: "0.875rem" }}>{label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h3>Top UTM Sources</h3>
          {topUtm.length === 0 ? (
            <p style={{ color: "#999" }}>No UTM data yet</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {topUtm.map(([src, count]) => (
                  <tr key={src}>
                    <td
                      style={{
                        padding: "0.5rem",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {src}
                    </td>
                    <td
                      style={{
                        padding: "0.5rem",
                        borderBottom: "1px solid #eee",
                        textAlign: "right",
                      }}
                    >
                      {count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <h3>Top Referrers</h3>
          {topRef.length === 0 ? (
            <p style={{ color: "#999" }}>No referrer data yet</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {topRef.map(([ref, count]) => (
                  <tr key={ref}>
                    <td
                      style={{
                        padding: "0.5rem",
                        borderBottom: "1px solid #eee",
                        wordBreak: "break-all",
                      }}
                    >
                      {ref}
                    </td>
                    <td
                      style={{
                        padding: "0.5rem",
                        borderBottom: "1px solid #eee",
                        textAlign: "right",
                      }}
                    >
                      {count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h3>GitHub Data Paths</h3>
        <code
          style={{
            display: "block",
            background: "#f5f5f5",
            padding: "0.5rem",
            borderRadius: 4,
            marginBottom: "0.5rem",
            wordBreak: "break-all",
          }}
        >
          {eventsPath}
        </code>
        <code
          style={{
            display: "block",
            background: "#f5f5f5",
            padding: "0.5rem",
            borderRadius: 4,
            wordBreak: "break-all",
          }}
        >
          {leadsPath}
        </code>
      </div>

      <div>
        <h3>Last 20 Leads</h3>
        <div
          style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}
        >
          <a
            href={`data:application/json,${encodeURIComponent(leadsJson)}`}
            download="leads.json"
            style={{
              padding: "0.5rem 1rem",
              background: "#4f46e5",
              color: "white",
              borderRadius: 4,
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            ↓ JSON
          </a>
          <a
            href={`data:text/csv,${encodeURIComponent(leadsCsv)}`}
            download="leads.csv"
            style={{
              padding: "0.5rem 1rem",
              background: "#059669",
              color: "white",
              borderRadius: 4,
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            ↓ CSV
          </a>
        </div>
        {last20Leads.length === 0 ? (
          <p style={{ color: "#999" }}>No leads today yet.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.875rem",
            }}
          >
            <thead>
              <tr style={{ background: "#f8f9ff" }}>
                {[
                  "Time",
                  "Name",
                  "Email",
                  "Org",
                  "Use Case",
                  "Compliance",
                  "UTM Source",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.75rem 0.5rem",
                      textAlign: "left",
                      borderBottom: "2px solid #e0e7ff",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {last20Leads.map((lead, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "0.5rem" }}>
                    {new Date(lead.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: "0.5rem" }}>{lead.full_name}</td>
                  <td style={{ padding: "0.5rem" }}>{lead.email}</td>
                  <td style={{ padding: "0.5rem" }}>
                    {lead.organization || "—"}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    {lead.use_case || "—"}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    {lead.needs_compliance_review ? "✓" : "—"}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    {lead.utm?.source || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
