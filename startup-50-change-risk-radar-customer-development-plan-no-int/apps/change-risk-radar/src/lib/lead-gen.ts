/**
 * src/lib/lead-gen.ts
 * Lead capture, UTM attribution, gated asset delivery, conversion tracking
 */
import { supabaseAdmin } from "@/lib/supabase";

export interface LeadInput {
  email: string;
  name?: string;
  company?: string;
  role?: string;
  source?: string;
  asset_slug?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  ip?: string;
}

export interface Lead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  role: string | null;
  source: string | null;
  asset_slug: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  converted_org_id: string | null;
  converted_at: string | null;
  created_at: string;
}

/** Hash an IP address for storage (one-way, non-reversible) */
async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + "crr-salt-2025");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/**
 * Capture a lead from a gated content form.
 * Returns existing lead if email+asset already exists (idempotent).
 */
export async function captureLead(input: LeadInput): Promise<{ lead: Lead; is_new: boolean }> {
  const ip_hash = input.ip ? await hashIp(input.ip) : null;

  // Check for existing lead with same email+asset
  const { data: existing } = await supabaseAdmin
    .from("crr_leads")
    .select("*")
    .eq("email", input.email)
    .eq("asset_slug", input.asset_slug ?? "")
    .single();

  if (existing) {
    return { lead: existing as Lead, is_new: false };
  }

  const { data, error } = await supabaseAdmin
    .from("crr_leads")
    .insert({
      email: input.email,
      name: input.name ?? null,
      company: input.company ?? null,
      role: input.role ?? null,
      source: input.source ?? "organic",
      asset_slug: input.asset_slug ?? null,
      utm_source: input.utm_source ?? null,
      utm_medium: input.utm_medium ?? null,
      utm_campaign: input.utm_campaign ?? null,
      utm_term: input.utm_term ?? null,
      utm_content: input.utm_content ?? null,
      referrer: input.referrer ?? null,
      ip_hash,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  // Send welcome/asset email async
  void sendLeadEmail(data as Lead, input.asset_slug);

  return { lead: data as Lead, is_new: true };
}

/** Mark a lead as converted when they create an org */
export async function convertLead(email: string, orgId: string): Promise<void> {
  await supabaseAdmin
    .from("crr_leads")
    .update({ converted_org_id: orgId, converted_at: new Date().toISOString() })
    .eq("email", email)
    .is("converted_org_id", null);
}

/** Get lead conversion stats for admin */
export async function getLeadStats(): Promise<{
  total: number;
  by_source: Record<string, number>;
  by_asset: Record<string, number>;
  converted: number;
  conversion_rate: number;
  recent: Lead[];
}> {
  const { data: leads } = await supabaseAdmin
    .from("crr_leads")
    .select("id,email,source,asset_slug,converted_org_id,converted_at,utm_source,utm_campaign,created_at")
    .order("created_at", { ascending: false });

  const all = (leads ?? []) as Lead[];
  const converted = all.filter(l => l.converted_org_id).length;

  const by_source: Record<string, number> = {};
  const by_asset: Record<string, number> = {};
  for (const l of all) {
    const s = l.source ?? "unknown";
    const a = l.asset_slug ?? "none";
    by_source[s] = (by_source[s] ?? 0) + 1;
    by_asset[a] = (by_asset[a] ?? 0) + 1;
  }

  return {
    total: all.length,
    by_source,
    by_asset,
    converted,
    conversion_rate: all.length > 0 ? Math.round((converted / all.length) * 100) : 0,
    recent: all.slice(0, 20),
  };
}

/** UTM parser for use in client-side lead forms */
export function parseUtmFromUrl(url: string): Record<string, string> {
  try {
    const u = new URL(url);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    const result: Record<string, string> = {};
    for (const k of keys) {
      const v = u.searchParams.get(k);
      if (v) result[k] = v;
    }
    return result;
  } catch {
    return {};
  }
}

/** Send the gated asset delivery email */
async function sendLeadEmail(lead: Lead, assetSlug?: string): Promise<void> {
  const assetLinks: Record<string, { title: string; url: string }> = {
    "change-risk-index": {
      title: "Monthly SaaS Change Risk Index",
      url: `https://change-risk-radar.vercel.app/change-risk-index`,
    },
    "stripe-playbook": {
      title: "Stripe Integration Playbook",
      url: `https://change-risk-radar.vercel.app/playbooks/stripe`,
    },
    "aws-playbook": {
      title: "AWS CloudTrail Playbook",
      url: `https://change-risk-radar.vercel.app/playbooks/aws`,
    },
    "salesforce-playbook": {
      title: "Salesforce Permissions Playbook",
      url: `https://change-risk-radar.vercel.app/playbooks/salesforce`,
    },
    "shopify-playbook": {
      title: "Shopify App Risk Playbook",
      url: `https://change-risk-radar.vercel.app/playbooks/shopify`,
    },
    "security-pack": {
      title: "Security & Compliance Pack",
      url: `https://change-risk-radar.vercel.app/pilot/security`,
    },
  };

  const asset = assetSlug ? assetLinks[assetSlug] : null;
  const name = lead.name ?? "there";

  const body = asset
    ? `Hi ${name},

Here's your copy of the ${asset.title}:

${asset.url}

This report is updated monthly from our Observatory — which monitors 28+ SaaS vendors for changes that create operational, legal, pricing, and security risk.

If you'd like to set up real-time monitoring for your own stack, start your free 14-day trial:

https://change-risk-radar.vercel.app/auth/signup

No credit card required.

— The Change Risk Radar Team`
    : `Hi ${name},

Thanks for your interest in Change Risk Radar.

We're building the vendor change monitoring layer that every SaaS-dependent company needs — plain-English alerts when Stripe changes pricing, Shopify updates app permissions, or AWS deprecates an IAM feature.

Start your free 14-day trial (no credit card):
https://change-risk-radar.vercel.app/auth/signup

Explore our sales hub:
https://change-risk-radar.vercel.app/sales

— The Change Risk Radar Team`;

  try {
    await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        to: lead.email,
        subject: asset
          ? `Your ${asset.title} is ready`
          : "Welcome to Change Risk Radar",
        text: body,
      }),
    });

    await supabaseAdmin
      .from("crr_leads")
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .eq("id", lead.id);
  } catch { /* non-fatal */ }
}
