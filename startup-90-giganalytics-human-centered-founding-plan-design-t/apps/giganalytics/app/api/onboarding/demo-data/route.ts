/**
 * POST /api/onboarding/demo-data
 * Seeds realistic sample records (2 streams, ~20 transactions, 8 time entries)
 * scoped to the authenticated user. Idempotent — skips if demo data exists.
 *
 * Returns: { seeded: boolean, summary: { streams, transactions, timeEntries } }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captureServerEvent } from "@/lib/posthog/server";

export const dynamic = "force-dynamic";

// ─── Demo data definitions ────────────────────────────────────────────────────

const DEMO_STREAMS = [
  { name: "Freelance Design", platform: "stripe", color: "#3b82f6" },
  { name: "Online Coaching", platform: "paypal", color: "#10b981" },
];

const today = new Date();
function daysAgo(n: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

const DEMO_TRANSACTIONS = [
  // Freelance Design (stream 0) — 12 transactions
  { si: 0, date: daysAgo(80), gross: 2500, fee: 75.25, net: 2424.75, desc: "Website Redesign – Acme Corp Phase 1", src: "demo-001" },
  { si: 0, date: daysAgo(74), gross: 150,  fee: 4.65,  net: 145.35,  desc: "UX Consultation – 1h",                src: "demo-002" },
  { si: 0, date: daysAgo(68), gross: 800,  fee: 23.50, net: 776.50,  desc: "Monthly Retainer – Jan",              src: "demo-003" },
  { si: 0, date: daysAgo(60), gross: 3200, fee: 96.00, net: 3104.00, desc: "Brand Identity Package",              src: "demo-004" },
  { si: 0, date: daysAgo(52), gross: 600,  fee: 18.00, net: 582.00,  desc: "Logo Refresh – StartupX",            src: "demo-005" },
  { si: 0, date: daysAgo(44), gross: 800,  fee: 23.50, net: 776.50,  desc: "Monthly Retainer – Feb",             src: "demo-006" },
  { si: 0, date: daysAgo(38), gross: 1200, fee: 36.00, net: 1164.00, desc: "UI Component Library",               src: "demo-007" },
  { si: 0, date: daysAgo(30), gross: 800,  fee: 23.50, net: 776.50,  desc: "Monthly Retainer – Mar",             src: "demo-008" },
  { si: 0, date: daysAgo(22), gross: 450,  fee: 13.75, net: 436.25,  desc: "Mobile App Screens (3)",             src: "demo-009" },
  { si: 0, date: daysAgo(15), gross: 2000, fee: 60.00, net: 1940.00, desc: "SaaS Dashboard Design",             src: "demo-010" },
  { si: 0, date: daysAgo(7),  gross: 800,  fee: 23.50, net: 776.50,  desc: "Monthly Retainer – Apr",             src: "demo-011" },
  { si: 0, date: daysAgo(2),  gross: 350,  fee: 10.73, net: 339.27,  desc: "Icon Set Design",                    src: "demo-012" },
  // Online Coaching (stream 1) — 8 transactions
  { si: 1, date: daysAgo(76), gross: 250,  fee: 0,     net: 250.00,  desc: "Career Clarity Session – Sarah M",   src: "demo-013" },
  { si: 1, date: daysAgo(69), gross: 750,  fee: 0,     net: 750.00,  desc: "3-Session Package – James K",        src: "demo-014" },
  { si: 1, date: daysAgo(55), gross: 250,  fee: 0,     net: 250.00,  desc: "Career Clarity Session – Emma L",    src: "demo-015" },
  { si: 1, date: daysAgo(48), gross: 1200, fee: 0,     net: 1200.00, desc: "Monthly Group Coaching – April",     src: "demo-016" },
  { si: 1, date: daysAgo(35), gross: 250,  fee: 0,     net: 250.00,  desc: "Career Clarity Session – Mark T",    src: "demo-017" },
  { si: 1, date: daysAgo(28), gross: 750,  fee: 0,     net: 750.00,  desc: "3-Session Package – Alex W",         src: "demo-018" },
  { si: 1, date: daysAgo(14), gross: 1200, fee: 0,     net: 1200.00, desc: "Monthly Group Coaching – May",       src: "demo-019" },
  { si: 1, date: daysAgo(3),  gross: 250,  fee: 0,     net: 250.00,  desc: "Career Clarity Session – Priya N",   src: "demo-020" },
];

const DEMO_TIME_ENTRIES = [
  // Freelance Design
  { si: 0, start: `${daysAgo(80)}T09:00:00Z`, end: `${daysAgo(80)}T17:00:00Z`, mins: 480, type: "billable", note: "Website Redesign kickoff" },
  { si: 0, start: `${daysAgo(74)}T10:00:00Z`, end: `${daysAgo(74)}T11:00:00Z`, mins: 60,  type: "billable", note: "UX Consultation" },
  { si: 0, start: `${daysAgo(60)}T09:00:00Z`, end: `${daysAgo(60)}T17:30:00Z`, mins: 510, type: "billable", note: "Brand Identity – Day 1" },
  { si: 0, start: `${daysAgo(59)}T09:00:00Z`, end: `${daysAgo(59)}T16:00:00Z`, mins: 420, type: "billable", note: "Brand Identity – Day 2" },
  { si: 0, start: `${daysAgo(38)}T09:00:00Z`, end: `${daysAgo(38)}T17:00:00Z`, mins: 480, type: "billable", note: "UI Component Library" },
  { si: 0, start: `${daysAgo(22)}T14:00:00Z`, end: `${daysAgo(22)}T17:30:00Z`, mins: 210, type: "billable", note: "Mobile App Screens" },
  // Online Coaching
  { si: 1, start: `${daysAgo(76)}T15:00:00Z`, end: `${daysAgo(76)}T16:00:00Z`, mins: 60,  type: "billable", note: "Career Clarity – Sarah M" },
  { si: 1, start: `${daysAgo(48)}T18:00:00Z`, end: `${daysAgo(48)}T19:30:00Z`, mins: 90,  type: "billable", note: "Group Coaching – April session" },
];

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Idempotency: check if demo data already exists
  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", user.id)
    .like("source_id", "demo-%")
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({
      seeded: false,
      message: "Demo data already loaded",
    });
  }

  // 1. Create streams
  const streamIds: string[] = [];
  for (const s of DEMO_STREAMS) {
    const { data, error } = await supabase
      .from("streams")
      .insert({ user_id: user.id, name: s.name, platform: s.platform, color: s.color })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    streamIds.push(data.id);
  }

  // 2. Insert transactions
  const txRows = DEMO_TRANSACTIONS.map((t) => ({
    user_id: user.id,
    stream_id: streamIds[t.si],
    transaction_date: t.date,
    amount: t.gross,
    fee_amount: t.fee,
    net_amount: t.net,
    description: t.desc,
    source_id: t.src,
    currency: "USD",
    source_platform: DEMO_STREAMS[t.si].platform,
  }));

  const { error: txErr } = await supabase.from("transactions").insert(txRows);
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  // 3. Insert time entries
  const teRows = DEMO_TIME_ENTRIES.map((e) => ({
    user_id: user.id,
    stream_id: streamIds[e.si],
    started_at: e.start,
    ended_at: e.end,
    duration_minutes: e.mins,
    entry_type: e.type,
    note: e.note,
  }));

  const { error: teErr } = await supabase.from("time_entries").insert(teRows);
  if (teErr) return NextResponse.json({ error: teErr.message }, { status: 500 });

  // Mark onboarding as completed so users don't get re-routed
  await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', user.id)

  captureServerEvent(user.id, 'demo_data_loaded', {
    streams: streamIds.length,
    transactions: txRows.length,
    time_entries: teRows.length,
    source: 'onboarding_checklist',
  }).catch(() => {})

  return NextResponse.json({
    seeded: true,
    summary: {
      streams: streamIds.length,
      transactions: txRows.length,
      timeEntries: teRows.length,
    },
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Remove demo data
  await supabase.from("transactions").delete()
    .eq("user_id", user.id).like("source_id", "demo-%");

  // Find and remove demo streams by name
  const demoNames = DEMO_STREAMS.map((s) => s.name);
  await supabase.from("streams").delete()
    .eq("user_id", user.id).in("name", demoNames);

  return NextResponse.json({ cleared: true });
}
