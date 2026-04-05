/**
 * GET   /api/support/tickets/[id]  — get ticket + messages
 * PATCH /api/support/tickets/[id]  — add message or update status
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getTicket,
  addTicketMessage,
  updateTicketStatus,
  type TicketStatus,
} from "@/lib/help-center";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function checkAdmin(req: NextRequest) {
  const secret = req.headers.get("x-portal-secret") ?? req.nextUrl.searchParams.get("secret");
  return secret === (process.env.PORTAL_SECRET ?? "crr-portal-2025");
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const ticket = await getTicket(id);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = req.headers.get("x-org-token") ?? req.nextUrl.searchParams.get("token");
  const email = req.nextUrl.searchParams.get("email");
  const isAdmin = checkAdmin(req);

  if (!isAdmin && !token) {
    if (email && ticket.reporter_email === email) {
      return NextResponse.json({ ok: true, ticket });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (token && !isAdmin) {
    const { data: org } = await supabaseAdmin
      .from("crr_orgs")
      .select("id")
      .eq("magic_token", token)
      .single();
    if (!org || org.id !== ticket.org_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ ok: true, ticket });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const body = await req.json() as {
    action?: string;
    message?: string;
    sender_email?: string;
    sender_name?: string;
    is_internal?: boolean;
    status?: TicketStatus;
    assigned_to?: string;
  };

  const isAdmin = checkAdmin(req);
  const token = req.headers.get("x-org-token") ?? req.nextUrl.searchParams.get("token");

  if (!isAdmin && !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await getTicket(id);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const action = body.action ?? "add_message";

  if (action === "add_message") {
    if (!body.message || !body.sender_email) {
      return NextResponse.json({ error: "message and sender_email required" }, { status: 400 });
    }
    await addTicketMessage(id, body.sender_email, body.message, {
      senderName: body.sender_name,
      isInternal: body.is_internal && isAdmin,
    });

    if (isAdmin && ticket.status === "open") {
      await updateTicketStatus(id, "in_progress", body.sender_email);
    }
    return NextResponse.json({ ok: true, action: "message_added" });
  }

  if (action === "update_status") {
    if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
    if (!body.status) return NextResponse.json({ error: "status required" }, { status: 400 });
    await updateTicketStatus(id, body.status, body.assigned_to);
    return NextResponse.json({ ok: true, action: "status_updated", status: body.status });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
