import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vendor = searchParams.get("vendor");
  const category = searchParams.get("category");
  const risk = searchParams.get("risk");
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabaseAdmin
    .from("crr_diffs")
    .select("*, crr_vendors(name, slug, category)", { count: "exact" })
    .order("collected_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (vendor) query = query.eq("vendor_slug", vendor);
  if (category) query = query.eq("risk_category", category);
  if (risk) query = query.eq("risk_level", risk);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Weekly count
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: weeklyCount } = await supabaseAdmin
    .from("crr_diffs")
    .select("id", { count: "exact", head: true })
    .gte("collected_at", weekAgo);

  // Vendor breakdown
  const { data: vendorBreakdown } = await supabaseAdmin
    .from("crr_diffs")
    .select("vendor_slug")
    .then(({ data }) => {
      const counts: Record<string, number> = {};
      for (const d of data || []) counts[d.vendor_slug] = (counts[d.vendor_slug] || 0) + 1;
      return { data: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15) };
    });

  return NextResponse.json({
    diffs: data,
    total: count,
    weekly: weeklyCount || 0,
    vendorBreakdown,
    timestamp: new Date().toISOString(),
  });
}
