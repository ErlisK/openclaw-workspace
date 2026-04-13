/**
 * src/lib/help-center.ts
 * Help center, status page, ticketing, and incident comms library
 */
import { supabaseAdmin } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  excerpt: string | null;
  tags: string[];
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  sort_order: number;
  updated_at: string;
}

export type ComponentStatus =
  | "operational"
  | "degraded_performance"
  | "partial_outage"
  | "major_outage"
  | "maintenance";

export type IncidentStatus =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved"
  | "scheduled";

export type IncidentImpact = "none" | "minor" | "major" | "critical";

export interface StatusComponent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ComponentStatus;
  display_order: number;
}

export interface StatusIncident {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  affected_components: string[];
  body: string;
  resolved_at: string | null;
  scheduled_for: string | null;
  scheduled_until: string | null;
  created_at: string;
  updated_at: string;
  updates?: StatusUpdate[];
}

export interface StatusUpdate {
  id: string;
  incident_id: string;
  status: string;
  body: string;
  created_at: string;
}

export type TicketCategory =
  | "general"
  | "billing"
  | "connector"
  | "alert"
  | "security"
  | "feature_request"
  | "bug"
  | "incident";

export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_on_customer"
  | "resolved"
  | "closed";

export interface SupportTicket {
  id: string;
  ticket_number: string;
  org_id: string | null;
  reporter_email: string;
  reporter_name: string | null;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  assigned_to: string | null;
  tags: string[];
  resolved_at: string | null;
  first_response_at: string | null;
  created_at: string;
  updated_at: string;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_email: string;
  sender_name: string | null;
  is_internal: boolean;
  body: string;
  attachments: unknown[];
  created_at: string;
}

export interface CreateTicketInput {
  org_id?: string;
  reporter_email: string;
  reporter_name?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  subject: string;
  description: string;
  tags?: string[];
}

// ─── Help Center ──────────────────────────────────────────────────────────────

export async function getHelpArticles(category?: string): Promise<HelpArticle[]> {
  let q = supabaseAdmin
    .from("crr_help_articles")
    .select("id,slug,title,category,excerpt,tags,view_count,helpful_count,not_helpful_count,sort_order,updated_at")
    .eq("is_published", true)
    .order("sort_order");

  if (category) q = q.eq("category", category);

  const { data } = await q;
  return (data ?? []) as HelpArticle[];
}

export async function getHelpArticle(slug: string): Promise<HelpArticle | null> {
  const { data } = await supabaseAdmin
    .from("crr_help_articles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (data) {
    // Increment view count async
    void supabaseAdmin
      .from("crr_help_articles")
      .update({ view_count: (data.view_count ?? 0) + 1 })
      .eq("id", data.id);
  }

  return (data as HelpArticle) ?? null;
}

export async function searchHelpArticles(query: string): Promise<HelpArticle[]> {
  const q = query.toLowerCase().trim();
  const { data } = await supabaseAdmin
    .from("crr_help_articles")
    .select("id,slug,title,category,excerpt,tags,sort_order,updated_at")
    .eq("is_published", true)
    .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
    .order("sort_order")
    .limit(10);

  return (data ?? []) as HelpArticle[];
}

export async function rateArticle(slug: string, helpful: boolean): Promise<void> {
  const { data } = await supabaseAdmin
    .from("crr_help_articles")
    .select("id,helpful_count,not_helpful_count")
    .eq("slug", slug)
    .single();

  if (!data) return;

  await supabaseAdmin
    .from("crr_help_articles")
    .update(
      helpful
        ? { helpful_count: (data.helpful_count ?? 0) + 1 }
        : { not_helpful_count: (data.not_helpful_count ?? 0) + 1 }
    )
    .eq("id", data.id);
}

export const HELP_CATEGORIES = [
  { id: "getting-started", label: "Getting Started", emoji: "🚀" },
  { id: "connectors", label: "Connectors", emoji: "🔌" },
  { id: "alerts", label: "Alerts", emoji: "🔔" },
  { id: "billing", label: "Billing", emoji: "💳" },
  { id: "security", label: "Security", emoji: "🔒" },
  { id: "api", label: "API", emoji: "⚡" },
];

// ─── Status Page ──────────────────────────────────────────────────────────────

export async function getStatusComponents(): Promise<StatusComponent[]> {
  const { data } = await supabaseAdmin
    .from("crr_status_components")
    .select("*")
    .eq("is_active", true)
    .order("display_order");

  return (data ?? []) as StatusComponent[];
}

export async function getActiveIncidents(): Promise<StatusIncident[]> {
  const { data: incidents } = await supabaseAdmin
    .from("crr_status_incidents")
    .select("*")
    .not("status", "eq", "resolved")
    .order("created_at", { ascending: false });

  if (!incidents?.length) return [];

  const ids = incidents.map(i => i.id);
  const { data: updates } = await supabaseAdmin
    .from("crr_status_updates")
    .select("*")
    .in("incident_id", ids)
    .order("created_at", { ascending: false });

  return incidents.map(inc => ({
    ...inc,
    updates: (updates ?? []).filter(u => u.incident_id === inc.id),
  })) as StatusIncident[];
}

export async function getRecentIncidents(days = 30): Promise<StatusIncident[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data: incidents } = await supabaseAdmin
    .from("crr_status_incidents")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!incidents?.length) return [];

  const ids = incidents.map(i => i.id);
  const { data: updates } = await supabaseAdmin
    .from("crr_status_updates")
    .select("*")
    .in("incident_id", ids)
    .order("created_at", { ascending: false });

  return incidents.map(inc => ({
    ...inc,
    updates: (updates ?? []).filter(u => u.incident_id === inc.id),
  })) as StatusIncident[];
}

export async function getOverallStatus(
  components: StatusComponent[]
): Promise<ComponentStatus> {
  const priorities: ComponentStatus[] = [
    "major_outage",
    "partial_outage",
    "degraded_performance",
    "maintenance",
    "operational",
  ];

  for (const p of priorities) {
    if (components.some(c => c.status === p)) return p;
  }
  return "operational";
}

export const STATUS_LABELS: Record<ComponentStatus, { label: string; color: string; bg: string }> = {
  operational: { label: "Operational", color: "text-green-700", bg: "bg-green-100" },
  degraded_performance: { label: "Degraded Performance", color: "text-yellow-700", bg: "bg-yellow-100" },
  partial_outage: { label: "Partial Outage", color: "text-orange-700", bg: "bg-orange-100" },
  major_outage: { label: "Major Outage", color: "text-red-700", bg: "bg-red-100" },
  maintenance: { label: "Under Maintenance", color: "text-blue-700", bg: "bg-blue-100" },
};

export const IMPACT_LABELS: Record<IncidentImpact, { label: string; color: string }> = {
  none: { label: "None", color: "text-gray-600" },
  minor: { label: "Minor", color: "text-yellow-600" },
  major: { label: "Major", color: "text-orange-600" },
  critical: { label: "Critical", color: "text-red-600" },
};

// ─── Support Tickets ──────────────────────────────────────────────────────────

export async function createTicket(input: CreateTicketInput): Promise<SupportTicket> {
  const ticket_number = `CRR-${Date.now().toString().slice(-6)}`;

  const { data, error } = await supabaseAdmin
    .from("crr_support_tickets")
    .insert({
      ticket_number,
      org_id: input.org_id ?? null,
      reporter_email: input.reporter_email,
      reporter_name: input.reporter_name ?? null,
      category: input.category ?? "general",
      priority: input.priority ?? "normal",
      subject: input.subject,
      description: input.description,
      tags: input.tags ?? [],
      status: "open",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  // Send acknowledgement email
  void sendTicketAck(data as SupportTicket);

  return data as SupportTicket;
}

export async function getTicket(id: string): Promise<SupportTicket | null> {
  const { data: ticket } = await supabaseAdmin
    .from("crr_support_tickets")
    .select("*")
    .eq("id", id)
    .single();

  if (!ticket) return null;

  const { data: messages } = await supabaseAdmin
    .from("crr_ticket_messages")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at");

  return { ...ticket, messages: messages ?? [] } as SupportTicket;
}

export async function addTicketMessage(
  ticketId: string,
  senderEmail: string,
  body: string,
  opts?: { senderName?: string; isInternal?: boolean }
): Promise<void> {
  await supabaseAdmin.from("crr_ticket_messages").insert({
    ticket_id: ticketId,
    sender_email: senderEmail,
    sender_name: opts?.senderName ?? null,
    body,
    is_internal: opts?.isInternal ?? false,
  });

  await supabaseAdmin
    .from("crr_support_tickets")
    .update({
      updated_at: new Date().toISOString(),
      ...(opts?.isInternal ? {} : { first_response_at: new Date().toISOString() }),
    })
    .eq("id", ticketId)
    .is("first_response_at", null);
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
  assignedTo?: string
): Promise<void> {
  await supabaseAdmin
    .from("crr_support_tickets")
    .update({
      status,
      ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
      ...(assignedTo ? { assigned_to: assignedTo } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function getTicketsForOrg(orgId: string): Promise<SupportTicket[]> {
  const { data } = await supabaseAdmin
    .from("crr_support_tickets")
    .select("id,ticket_number,category,priority,status,subject,created_at,updated_at,resolved_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return (data ?? []) as SupportTicket[];
}

// ─── Incident Comms Templates ─────────────────────────────────────────────────

export interface IncidentCommsContext {
  incident_title: string;
  incident_status: IncidentStatus;
  impact: IncidentImpact;
  affected_components: string[];
  body: string;
  started_at: string;
  resolved_at?: string;
  next_update?: string;
  incident_url: string;
}

export const INCIDENT_COMMS_TEMPLATES: Record<
  string,
  {
    channel: "email" | "slack" | "in_app";
    label: string;
    description: string;
    subject?: string | ((ctx: IncidentCommsContext) => string);
    getBody: (ctx: IncidentCommsContext) => string;
  }
> = {
  "incident.investigating.email": {
    channel: "email",
    label: "New Incident — Investigating",
    description: "Initial email notification when an incident is first identified",
    subject: (ctx => `[Investigating] ${ctx.incident_title}`),
    getBody: (ctx) => `We are currently investigating an issue with ${ctx.affected_components.join(", ")}.

**Status:** Investigating
**Impact:** ${ctx.impact.charAt(0).toUpperCase() + ctx.impact.slice(1)}

${ctx.body}

We will provide an update within 30 minutes. Track real-time status at: ${ctx.incident_url}

— The Change Risk Radar Team`,
  },

  "incident.identified.email": {
    channel: "email",
    label: "Incident Identified",
    description: "Email when root cause has been identified",
    subject: (ctx => `[Identified] ${ctx.incident_title}`),
    getBody: (ctx) => `We have identified the root cause of the incident affecting ${ctx.affected_components.join(", ")}.

**Status:** Root Cause Identified
**Impact:** ${ctx.impact.charAt(0).toUpperCase() + ctx.impact.slice(1)}

${ctx.body}

Our team is working on a fix. We expect to provide a further update by ${ctx.next_update ?? "within 1 hour"}.

Track live status: ${ctx.incident_url}

— The Change Risk Radar Team`,
  },

  "incident.resolved.email": {
    channel: "email",
    label: "Incident Resolved",
    description: "Resolution email with summary and postmortem promise",
    subject: (ctx => `[Resolved] ${ctx.incident_title}`),
    getBody: (ctx) => `The incident affecting ${ctx.affected_components.join(", ")} has been resolved.

**Resolved at:** ${ctx.resolved_at ?? new Date().toISOString()}
**Duration:** ${ctx.started_at ? Math.round((Date.now() - new Date(ctx.started_at).getTime()) / 60000) + " minutes" : "—"}

${ctx.body}

All systems are now operational. A postmortem will be published within 5 business days.

We apologize for any disruption this caused. If you have questions, reply to this email or open a support ticket.

Track status history: ${ctx.incident_url}

— The Change Risk Radar Team`,
  },

  "incident.investigating.slack": {
    channel: "slack",
    label: "New Incident — Slack",
    description: "Slack message for new incident notification",
    getBody: (ctx) => `:red_circle: *Incident: ${ctx.incident_title}*\n\n*Status:* Investigating\n*Impact:* ${ctx.impact}\n*Affected:* ${ctx.affected_components.join(", ")}\n\n${ctx.body}\n\nTrack status: ${ctx.incident_url}`,
  },

  "incident.resolved.slack": {
    channel: "slack",
    label: "Incident Resolved — Slack",
    description: "Slack message when incident is resolved",
    getBody: (ctx) => `:white_check_mark: *Resolved: ${ctx.incident_title}*\n\nAll systems are now operational. Duration: ${ctx.started_at ? Math.round((Date.now() - new Date(ctx.started_at).getTime()) / 60000) + " min" : "—"}\n\n${ctx.body}\n\nFull details: ${ctx.incident_url}`,
  },

  "incident.monitoring.slack": {
    channel: "slack",
    label: "Monitoring Fix — Slack",
    description: "Slack message when fix is deployed and being monitored",
    getBody: (ctx) => `:eyes: *Monitoring: ${ctx.incident_title}*\n\n*Status:* Fix deployed, monitoring\n*Affected:* ${ctx.affected_components.join(", ")}\n\n${ctx.body}\n\nNext update: ${ctx.next_update ?? "30 minutes"} | Status: ${ctx.incident_url}`,
  },

  "incident.update.in_app": {
    channel: "in_app",
    label: "In-App Status Banner",
    description: "Banner text for in-app incident notification",
    getBody: (ctx) => `⚠️ We are experiencing issues with ${ctx.affected_components.join(", ")}. ${ctx.body} — Track status at /status`,
  },

  "maintenance.scheduled.email": {
    channel: "email",
    label: "Scheduled Maintenance Notice",
    description: "Email sent in advance of planned maintenance window",
    subject: (ctx => `[Scheduled Maintenance] ${ctx.incident_title}`),
    getBody: (ctx) => `We have scheduled maintenance that may affect ${ctx.affected_components.join(", ")}.

**Scheduled:** ${ctx.started_at}
**Duration:** Until approximately ${ctx.next_update ?? "completion"}
**Impact:** Possible brief interruption to ${ctx.affected_components.join(", ")}

${ctx.body}

No action is required on your part. We will notify you when maintenance is complete.

Track status: ${ctx.incident_url}

— The Change Risk Radar Team`,
  },
};

export function renderIncidentComms(
  templateKey: string,
  ctx: IncidentCommsContext
): { subject?: string; body: string; channel: string } | null {
  const tmpl = INCIDENT_COMMS_TEMPLATES[templateKey];
  if (!tmpl) return null;

  const subject =
    typeof tmpl.subject === "function"
      ? tmpl.subject(ctx)
      : tmpl.subject;

  return { subject, body: tmpl.getBody(ctx), channel: tmpl.channel };
}

export async function sendIncidentComms(
  incidentId: string,
  templateKey: string,
  recipients: string[],
  ctx: IncidentCommsContext
): Promise<void> {
  const rendered = renderIncidentComms(templateKey, ctx);
  if (!rendered) return;

  const { error } = await supabaseAdmin.from("crr_incident_comms").insert({
    incident_id: incidentId,
    template_key: templateKey,
    channel: rendered.channel,
    subject: rendered.subject ?? null,
    body: rendered.body,
    recipients,
    sent_at: rendered.channel !== "email" ? new Date().toISOString() : null,
    status: "draft",
  });

  if (!error && rendered.channel === "email" && recipients.length > 0) {
    // Send via AgentMail
    for (const to of recipients) {
      try {
        await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
          },
          body: JSON.stringify({
            to,
            subject: rendered.subject ?? `Status Update: ${ctx.incident_title}`,
            text: rendered.body,
          }),
        });
      } catch { /* non-fatal */ }
    }

    await supabaseAdmin
      .from("crr_incident_comms")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("incident_id", incidentId)
      .eq("template_key", templateKey);
  }
}

// ─── Auto-acknowledgement email ───────────────────────────────────────────────

async function sendTicketAck(ticket: SupportTicket): Promise<void> {
  const body = `Hi ${ticket.reporter_name ?? "there"},

Thank you for contacting Change Risk Radar support.

Your ticket has been received:

  Ticket #: ${ticket.ticket_number}
  Subject:  ${ticket.subject}
  Priority: ${ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}

Our team will respond within:
- Urgent: 1 business hour
- High: 4 business hours
- Normal/Low: 1 business day

You can check your ticket status at:
https://change-risk-radar.vercel.app/support/${ticket.id}

— The Change Risk Radar Support Team`;

  try {
    await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        to: ticket.reporter_email,
        subject: `[${ticket.ticket_number}] ${ticket.subject} — Support Received`,
        text: body,
      }),
    });
  } catch { /* non-fatal */ }
}
