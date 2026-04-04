import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function adminAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET ?? "crr-cron-2025";
  return auth === `Bearer ${secret}`;
}

// GET — list all rule templates (with optional filters)
export async function GET(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = req.nextUrl.searchParams.get("vendor");
  const category = req.nextUrl.searchParams.get("category");
  const active = req.nextUrl.searchParams.get("active");

  let query = supabaseAdmin
    .from("crr_rule_templates")
    .select("*")
    .order("priority", { ascending: false })
    .order("vendor_slug");

  if (vendor) query = query.eq("vendor_slug", vendor);
  if (category) query = query.eq("risk_category", category);
  if (active !== null) query = query.eq("is_active", active === "true");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rules: data, total: data?.length ?? 0 });
}

// PATCH — update a rule template field
export async function PATCH(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { id, ...updates } = body;

  // Only allow updating safe fields
  const ALLOWED_FIELDS = new Set([
    "rule_name", "is_active", "priority", "confidence_threshold",
    "dedup_window_hours", "risk_level", "risk_category", "match_patterns",
    "target_url", "refinement_notes", "refinement_action",
  ]);

  const safeUpdates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (ALLOWED_FIELDS.has(k)) safeUpdates[k] = v;
  }

  if (!Object.keys(safeUpdates).length) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("crr_rule_templates")
    .update(safeUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rule: data });
}

// POST — bulk operations on rules
export async function POST(req: NextRequest) {
  if (!adminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action, ids, patch } = body;

  if (action === "bulk_toggle") {
    const { data, error } = await supabaseAdmin
      .from("crr_rule_templates")
      .update({ is_active: body.active })
      .in("id", ids ?? [])
      .select("id, rule_name, is_active");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, updated: data?.length ?? 0, rules: data });
  }

  if (action === "bulk_patch") {
    // Apply same patch to multiple rules
    const ALLOWED_FIELDS = new Set(["priority", "confidence_threshold", "dedup_window_hours"]);
    const safePatch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch ?? {})) {
      if (ALLOWED_FIELDS.has(k)) safePatch[k] = v;
    }
    const { data, error } = await supabaseAdmin
      .from("crr_rule_templates")
      .update(safePatch)
      .in("id", ids ?? [])
      .select("id, rule_name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, updated: data?.length ?? 0 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
