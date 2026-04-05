/**
 * src/lib/partner-portal.ts
 * Partner portal: auth, dashboard data, referral tracking, commission calculation
 */
import { supabaseAdmin } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Partner {
  id: string;
  name: string;
  company: string;
  email: string;
  website: string | null;
  partner_type: string;
  status: string;
  tier: string;
  referral_code: string;
  commission_pct: number;
  total_referred: number;
  total_converted: number;
  total_arr: number;
  portal_token: string;
  last_login_at: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface PartnerOpportunity {
  id: string;
  partner_id: string;
  prospect_email: string;
  prospect_name: string | null;
  prospect_company: string | null;
  stage: string;
  est_arr: number | null;
  close_date: string | null;
  notes: string | null;
  org_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerClick {
  id: string;
  partner_id: string;
  referral_code: string;
  ip_hash: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  landing_page: string | null;
  converted: boolean;
  converted_at: string | null;
  created_at: string;
}

export interface PartnerDashboardData {
  partner: Partner;
  opportunities: PartnerOpportunity[];
  clicks: { total: number; this_month: number; converted: number; conversion_rate: number };
  pipeline_value: number;
  closed_arr: number;
  estimated_commission: number;
  recent_activity: { date: string; action: string; detail: string }[];
  tier_progress: { current_arr: number; next_tier_arr: number; next_tier: string; pct: number };
}

const TIER_THRESHOLDS: Record<string, number> = {
  standard: 0,
  silver: 50000,
  gold: 150000,
  platinum: 500000,
};

const TIER_COMMISSION: Record<string, number> = {
  standard: 20,
  silver: 25,
  gold: 30,
  platinum: 35,
};

const NEXT_TIER: Record<string, string> = {
  standard: "silver",
  silver: "gold",
  gold: "platinum",
  platinum: "platinum",
};

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Authenticate partner by portal_token.
 * Returns the partner record or null if invalid.
 */
export async function getPartnerByToken(token: string): Promise<Partner | null> {
  const { data } = await supabaseAdmin
    .from("crr_partners")
    .select("*")
    .eq("portal_token", token)
    .eq("status", "active")
    .single();

  if (!data) return null;

  // Update last login
  void supabaseAdmin
    .from("crr_partners")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.id);

  return data as Partner;
}

export async function getPartnerByCode(code: string): Promise<Partner | null> {
  const { data } = await supabaseAdmin
    .from("crr_partners")
    .select("id, name, company, referral_code, status, tier, commission_pct, portal_token")
    .eq("referral_code", code.toUpperCase())
    .single();
  return data as Partner | null;
}

// ── Referral tracking ─────────────────────────────────────────────────────────

export async function trackReferralClick(input: {
  referral_code: string;
  ip?: string;
  utm_source?: string;
  utm_medium?: string;
  landing_page?: string;
}): Promise<void> {
  const partner = await getPartnerByCode(input.referral_code);
  if (!partner) return;

  const ip_hash = input.ip
    ? await hashValue(input.ip + "crr-partner-salt")
    : null;

  await supabaseAdmin.from("crr_partner_clicks").insert({
    partner_id: partner.id,
    referral_code: input.referral_code,
    ip_hash,
    utm_source: input.utm_source ?? null,
    utm_medium: input.utm_medium ?? null,
    landing_page: input.landing_page ?? null,
    converted: false,
  });
}

export async function convertReferralClick(referralCode: string, leadId: string): Promise<void> {
  await supabaseAdmin
    .from("crr_partner_clicks")
    .update({ converted: true, converted_at: new Date().toISOString(), lead_id: leadId })
    .eq("referral_code", referralCode)
    .eq("converted", false)
    .order("created_at", { ascending: false })
    .limit(1);

  // Update partner total_referred
  const partner = await getPartnerByCode(referralCode);
  if (partner) {
    await supabaseAdmin
      .from("crr_partners")
      .update({ total_referred: (partner.total_referred ?? 0) + 1 })
      .eq("id", partner.id);
  }
}

// ── Dashboard data ─────────────────────────────────────────────────────────────

export async function getPartnerDashboard(partnerId: string): Promise<PartnerDashboardData> {
  const { data: partner } = await supabaseAdmin
    .from("crr_partners")
    .select("*")
    .eq("id", partnerId)
    .single();

  if (!partner) throw new Error("Partner not found");

  const p = partner as Partner;

  // Get opportunities
  const { data: opps } = await supabaseAdmin
    .from("crr_partner_opportunities")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  const opportunities = (opps ?? []) as PartnerOpportunity[];

  // Click stats
  const { data: clicks } = await supabaseAdmin
    .from("crr_partner_clicks")
    .select("converted, created_at")
    .eq("partner_id", partnerId);

  const allClicks = clicks ?? [];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const totalClicks = allClicks.length;
  const monthClicks = allClicks.filter(c => new Date(c.created_at) >= monthStart).length;
  const convertedClicks = allClicks.filter(c => c.converted).length;
  const convRate = totalClicks > 0 ? Math.round((convertedClicks / totalClicks) * 100) : 0;

  // Pipeline value (open opportunities)
  const pipelineValue = opportunities
    .filter(o => !["closed_won", "closed_lost"].includes(o.stage))
    .reduce((sum, o) => sum + (o.est_arr ?? 0), 0);

  // Closed ARR
  const closedArr = opportunities
    .filter(o => o.stage === "closed_won")
    .reduce((sum, o) => sum + (o.est_arr ?? 0), 0);

  const currentCommission = TIER_COMMISSION[p.tier] ?? 20;
  const estimatedCommission = Math.round(closedArr * currentCommission / 100);

  // Recent activity
  const recentActivity: PartnerDashboardData["recent_activity"] = [
    ...opportunities.slice(0, 3).map(o => ({
      date: o.created_at.slice(0, 10),
      action: "New Opportunity",
      detail: `${o.prospect_company ?? o.prospect_email} — ${o.stage} (est. $${(o.est_arr ?? 0).toLocaleString()}/yr)`,
    })),
    ...allClicks.slice(0, 2).map(c => ({
      date: c.created_at.slice(0, 10),
      action: c.converted ? "Referral Converted" : "Referral Click",
      detail: c.converted ? "Prospect signed up for a trial" : "Prospect visited via your referral link",
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  // Tier progress
  const nextTier = NEXT_TIER[p.tier] ?? "platinum";
  const nextTierArr = TIER_THRESHOLDS[nextTier] ?? 500000;
  const currentArr = p.total_arr ?? 0;
  const tierPct = nextTierArr > 0 ? Math.min(100, Math.round((currentArr / nextTierArr) * 100)) : 100;

  return {
    partner: p,
    opportunities,
    clicks: {
      total: totalClicks,
      this_month: monthClicks,
      converted: convertedClicks,
      conversion_rate: convRate,
    },
    pipeline_value: pipelineValue,
    closed_arr: closedArr,
    estimated_commission: estimatedCommission,
    recent_activity: recentActivity,
    tier_progress: {
      current_arr: currentArr,
      next_tier_arr: nextTierArr,
      next_tier: nextTier,
      pct: tierPct,
    },
  };
}

// ── Registration ──────────────────────────────────────────────────────────────

export async function registerPartner(input: {
  name: string;
  company: string;
  email: string;
  website?: string;
  partner_type: string;
  description?: string;
}): Promise<{ partner_id: string; referral_code: string; portal_token: string }> {
  // Generate referral code from company name
  const codeBase = input.company
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  const referral_code = `${codeBase}-${suffix}`;
  const portal_token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const { data, error } = await supabaseAdmin
    .from("crr_partners")
    .insert({
      name: input.name,
      company: input.company,
      email: input.email,
      website: input.website ?? null,
      partner_type: input.partner_type,
      status: "pending",
      tier: "standard",
      referral_code,
      portal_token,
      commission_pct: 20,
    })
    .select("id, referral_code, portal_token")
    .single();

  if (error) throw new Error(error.message);

  // Send welcome email
  void sendPartnerWelcome(data.portal_token, input.name, input.email, referral_code);

  return { partner_id: data.id, referral_code: data.referral_code, portal_token: data.portal_token };
}

async function sendPartnerWelcome(token: string, name: string, email: string, code: string): Promise<void> {
  const body = `Hi ${name},

Thank you for applying to the Change Risk Radar Partner Program!

We'll review your application within 2 business days. Once approved:

  Your Referral Code: ${code}
  Your Referral Link: https://change-risk-radar.vercel.app/partners/${code}
  Your Partner Portal: https://change-risk-radar.vercel.app/partners/portal?token=${token}

You'll earn 20% recurring commission on every customer you refer.

We'll notify you by email when your account is approved.

— The Change Risk Radar Team`;

  try {
    await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        to: email,
        subject: "Partner Application Received — Change Risk Radar",
        text: body,
      }),
    });
  } catch { /* non-fatal */ }
}

// ── Utilities ──────────────────────────────────────────────────────────────────

async function hashValue(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

// Admin: get all partners with stats
export async function getAllPartners(): Promise<(Partner & { opportunity_count: number; click_count: number })[]> {
  const { data: partners } = await supabaseAdmin
    .from("crr_partners")
    .select("*")
    .order("status")
    .order("total_arr", { ascending: false });

  if (!partners?.length) return [];

  const ids = partners.map(p => p.id);

  const { data: oppCounts } = await supabaseAdmin
    .from("crr_partner_opportunities")
    .select("partner_id")
    .in("partner_id", ids);

  const { data: clickCounts } = await supabaseAdmin
    .from("crr_partner_clicks")
    .select("partner_id")
    .in("partner_id", ids);

  const oppMap: Record<string, number> = {};
  const clickMap: Record<string, number> = {};
  for (const o of oppCounts ?? []) oppMap[o.partner_id] = (oppMap[o.partner_id] ?? 0) + 1;
  for (const c of clickCounts ?? []) clickMap[c.partner_id] = (clickMap[c.partner_id] ?? 0) + 1;

  return partners.map(p => ({
    ...p,
    opportunity_count: oppMap[p.id] ?? 0,
    click_count: clickMap[p.id] ?? 0,
  })) as (Partner & { opportunity_count: number; click_count: number })[];
}

export const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  standard: { bg: "bg-gray-100",    text: "text-gray-700",   border: "border-gray-300" },
  silver:   { bg: "bg-blue-100",    text: "text-blue-700",   border: "border-blue-400" },
  gold:     { bg: "bg-yellow-100",  text: "text-yellow-700", border: "border-yellow-400" },
  platinum: { bg: "bg-purple-100",  text: "text-purple-700", border: "border-purple-400" },
};

export const STAGE_COLORS: Record<string, string> = {
  referred:     "bg-gray-100 text-gray-700",
  contacted:    "bg-blue-100 text-blue-700",
  demo:         "bg-indigo-100 text-indigo-700",
  trial:        "bg-purple-100 text-purple-700",
  negotiating:  "bg-orange-100 text-orange-700",
  closed_won:   "bg-green-100 text-green-700",
  closed_lost:  "bg-red-100 text-red-700",
};
