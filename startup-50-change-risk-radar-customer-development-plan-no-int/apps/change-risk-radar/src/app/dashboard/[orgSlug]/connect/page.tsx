import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import ConnectClient from "./ConnectClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Add Connector — Change Risk Radar" };

interface Props {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function ConnectPage({ params, searchParams }: Props) {
  const { orgSlug } = await params;
  const { token } = await searchParams;

  if (!token) redirect(`/auth/login?redirect=/dashboard/${orgSlug}/connect`);

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, slug, name, status")
    .eq("slug", orgSlug)
    .eq("magic_token", token)
    .single();

  if (!org) {
    return (
      <div style={{ padding: "3rem 0", textAlign: "center" }}>
        <div className="container">
          <h2>Invalid access link</h2>
          <a href="/onboard" className="btn-primary">Start over →</a>
        </div>
      </div>
    );
  }

  const { data: connectors } = await supabaseAdmin
    .from("crr_org_connectors")
    .select("type, vendor_slug, status, label")
    .eq("org_id", org.id)
    .eq("status", "active");

  return (
    <div style={{ padding: "2.5rem 0" }}>
      <div className="container" style={{ maxWidth: 860 }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <div className="tag" style={{ marginBottom: "0.4rem" }}>
            {org.name} · Connector Setup
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 0.35rem" }}>
            Connect your tools
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
            Each connector you add gets you real-time risk alerts for that tool.
            {(connectors?.length ?? 0) < 2 && " Connect at least 2 to reach full activation."}
          </p>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.5rem" }}>
          {[1, 2, 3].map(n => {
            const count = connectors?.length ?? 0;
            const done = count >= n;
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? "#10b981" : "var(--card-bg)", border: `2px solid ${done ? "#10b981" : "var(--border)"}`,
                  fontSize: "0.7rem", fontWeight: 700, color: done ? "white" : "var(--muted)",
                }}>
                  {done ? "✓" : n}
                </div>
                {n < 3 && <div style={{ width: 24, height: 2, background: done ? "#10b981" : "var(--border)" }} />}
              </div>
            );
          })}
          <span style={{ color: "var(--muted)", fontSize: "0.78rem", marginLeft: "0.5rem" }}>
            {connectors?.length ?? 0} / 3 connectors active
          </span>
        </div>

        <ConnectClient
          orgSlug={orgSlug}
          token={token}
          existingConnectors={connectors ?? []}
        />
      </div>
    </div>
  );
}
