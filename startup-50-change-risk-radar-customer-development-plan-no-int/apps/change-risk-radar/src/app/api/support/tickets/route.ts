/**
 * POST /api/support/tickets  — create a ticket (public)
 * GET  /api/support/tickets  — list tickets (admin or org-scoped)
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createTicket, getTicketsForOrg, type CreateTicketInput } from "@/lib/help-center";

export const dynamic = "force-dynamic";

function checkAdmin(req: NextRequest) {
  const secret = req.headers.get("x-portal-secret") ?? req.nextUrl.searchParams.get("secret");
  return secret === (process.env.PORTAL_SECRET ?? "crr-portal-2025");
}

async function getOrgFromToken(req: NextRequest) {
  const token = req.headers.get("x-org-token") ?? req.nextUrl.searchParams.get("token");
  if (!token) return null;
  const { data } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, slug")
    .eq("magic_token", token)
    .single();
  return data;
}

export async function GET(req: NextRequest) {
  const org = await getOrgFromToken(req);
  const isAdmin = checkAdmin(req);

  if (!org && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isAdmin) {
    // Admin: return all tickets with optional filters
    const status = req.nextUrl.searchParams.get("status");
    const priority = req.nextUrl.searchParams.get("priority");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);

    let q = supabaseAdmin
      .from("crr_support_tickets")
      .select("id,ticket_number,org_id,reporter_email,reporter_name,category,priority,status,subject,assigned_to,created_at,updated_at,resolved_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) q = q.eq("status", status);
    if (priority) q = q.eq("priority", priority);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Stats
    const { data: stats } = await supabaseAdmin
      .from("crr_support_tickets")
      .select("status, priority");

    const counts = { open: 0, in_progress: 0, resolved: 0, urgent: 0 };
    for (const t of stats ?? []) {
      if (t.status === "open") counts.open++;
      if (t.status === "in_progress") counts.in_progress++;
      if (t.status === "resolved") counts.resolved++;
      if (t.priority === "urgent") counts.urgent++;
    }

    return NextResponse.json({ ok: true, tickets: data ?? [], counts });
  }

  // Org: return own tickets
  const tickets = await getTicketsForOrg(org!.id);
  return NextResponse.json({ ok: true, tickets });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as CreateTicketInput & { token?: string };

  if (!body.reporter_email || !body.subject || !body.description) {
    return NextResponse.json(
      { error: "reporter_email, subject, and description are required" },
      { status: 400 }
    );
  }

  // Auto-link to org if token provided
  if (body.token) {
    const { data: org } = await supabaseAdmin
      .from("crr_orgs")
      .select("id")
      .eq("magic_token", body.token)
      .single();
    if (org) body.org_id = org.id;
  }

  try {
    const ticket = await createTicket(body);
    return NextResponse.json({ ok: true, ticket }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
