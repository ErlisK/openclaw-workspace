import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { runDetectorsForOrg } from "@/lib/detectors";
import { sendWelcomeEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

function makeToken(): string {
  const arr = new Uint8Array(24);
  for (let i = 0; i < 24; i++) arr[i] = Math.floor(Math.random() * 256);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, tos_agreed, dpa_agreed, connectors: connectorConfigs } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "name and email required" }, { status: 400 });
    }
    if (!tos_agreed || !dpa_agreed) {
      return NextResponse.json({ error: "Must agree to ToS and DPA" }, { status: 400 });
    }

    // Generate slug and token
    const baseSlug = slugify(name);
    const magic_token = makeToken();
    const tos_ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || null;

    // Check slug uniqueness
    let slug = baseSlug;
    const { data: existing } = await supabaseAdmin.from("crr_orgs").select("slug").eq("slug", baseSlug);
    if (existing?.length) slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Create org
    const { data: org, error: orgErr } = await supabaseAdmin
      .from("crr_orgs")
      .insert({
        slug,
        name,
        email,
        plan: "early_access",
        status: "active",
        tos_agreed_at: new Date().toISOString(),
        dpa_agreed_at: new Date().toISOString(),
        tos_ip,
        magic_token,
        config: { source: "self_serve_onboarding" },
      })
      .select()
      .single();

    if (orgErr) {
      console.error("Org create error:", orgErr);
      return NextResponse.json({ error: "Failed to create org" }, { status: 500 });
    }

    // Create connectors
    const connectorTypes: string[] = [];
    if (connectorConfigs?.length) {
      const connRows = connectorConfigs.map((c: {
        type: string;
        label?: string;
        config?: Record<string, unknown>;
      }) => ({
        org_id: org.id,
        type: c.type,
        label: c.label || c.type,
        config: c.config || {},
        status: "active",
      }));
      await supabaseAdmin.from("crr_org_connectors").insert(connRows);
      connectorTypes.push(...connectorConfigs.map((c: { type: string }) => c.type));
    } else {
      // Default: add stripe + workspace connectors
      await supabaseAdmin.from("crr_org_connectors").insert([
        { org_id: org.id, type: "stripe", label: "Stripe", config: { min_risk: "medium" }, status: "active" },
        { org_id: org.id, type: "workspace", label: "Google Workspace", config: { min_risk: "medium" }, status: "active" },
      ]);
      connectorTypes.push("stripe", "workspace");
    }

    // Run initial alert detection
    const detectionResult = await runDetectorsForOrg(org.id);

    // Send welcome email (fire and forget)
    sendWelcomeEmail({
      to: email,
      orgName: name,
      orgSlug: slug,
      magicToken: magic_token,
      connectorTypes,
    }).catch(e => console.error("Welcome email error:", e));

    // Also notify founder
    fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.AGENTMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        to: ["scide-founder@agentmail.to"],
        subject: `🎉 New early access org: ${name}`,
        text: `New org onboarded!\n\nName: ${name}\nEmail: ${email}\nSlug: ${slug}\nConnectors: ${connectorTypes.join(", ")}\nInitial alerts: ${detectionResult.newAlerts}\n\nDashboard: https://change-risk-radar.vercel.app/dashboard/${slug}?token=${magic_token}`,
      }),
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      org_slug: slug,
      magic_token,
      dashboard_url: `https://change-risk-radar.vercel.app/dashboard/${slug}?token=${magic_token}`,
      initial_alerts: detectionResult.newAlerts,
      connectors: connectorTypes.length,
    });
  } catch (err) {
    console.error("Org POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Admin endpoint: list orgs (requires cron secret)
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: orgs } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, slug, name, email, plan, status, created_at, tos_agreed_at")
    .order("created_at", { ascending: false });
  return NextResponse.json({ orgs: orgs ?? [] });
}
