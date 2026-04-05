/**
 * rbac.ts — Role-Based Access Control for Change Risk Radar
 *
 * Roles (org-scoped):
 *   owner  — full access: manage billing, connectors, members, delete org
 *   admin  — manage connectors, view/react to alerts, invite viewers
 *   viewer — read-only: view alerts, dashboard, weekly briefs
 *
 * Auth modes (two parallel systems):
 *   1. magic_token  — legacy alpha auth (checked by magic_token column)
 *   2. Supabase JWT — new SSO/password auth (user_id on crr_orgs + crr_org_members)
 *
 * RBAC is additive: magic_token holders get owner-level access by default.
 */

import { supabaseAdmin } from "@/lib/supabase";

// ─── Role Definitions ─────────────────────────────────────────────────────────

export type OrgRole = "owner" | "admin" | "viewer";
export type MemberStatus = "pending" | "active" | "revoked";

export type Permission =
  | "view_alerts"
  | "react_alerts"
  | "view_connectors"
  | "add_connector"
  | "remove_connector"
  | "view_members"
  | "invite_member"
  | "change_member_role"
  | "remove_member"
  | "view_billing"
  | "manage_billing"
  | "manage_notifications"
  | "view_weekly_brief"
  | "manage_org_settings"
  | "delete_org";

export const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: [
    "view_alerts", "react_alerts",
    "view_connectors", "add_connector", "remove_connector",
    "view_members", "invite_member", "change_member_role", "remove_member",
    "view_billing", "manage_billing",
    "manage_notifications", "view_weekly_brief",
    "manage_org_settings", "delete_org",
  ],
  admin: [
    "view_alerts", "react_alerts",
    "view_connectors", "add_connector",
    "view_members", "invite_member",
    "view_billing",
    "manage_notifications", "view_weekly_brief",
  ],
  viewer: [
    "view_alerts",
    "view_connectors",
    "view_members",
    "view_billing",
    "view_weekly_brief",
  ],
};

export function roleHasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// ─── Member Interface ─────────────────────────────────────────────────────────

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string | null;
  email: string;
  role: OrgRole;
  status: MemberStatus;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  last_active_at: string | null;
}

// ─── Permission Checking ──────────────────────────────────────────────────────

/**
 * Get effective role for a user in an org.
 * Checks both Supabase user_id membership and magic_token fallback.
 * Returns null if user has no access.
 */
export async function getEffectiveRole(
  orgId: string,
  opts: { userId?: string; magicToken?: string }
): Promise<OrgRole | null> {
  // Magic token = owner-level (legacy alpha auth)
  if (opts.magicToken) {
    const { data } = await supabaseAdmin
      .from("crr_orgs")
      .select("id, magic_token")
      .eq("id", orgId)
      .eq("magic_token", opts.magicToken)
      .single();
    if (data) return "owner";
  }

  // Supabase user_id check
  if (opts.userId) {
    // Check if user is org owner
    const { data: org } = await supabaseAdmin
      .from("crr_orgs")
      .select("id, user_id")
      .eq("id", orgId)
      .eq("user_id", opts.userId)
      .single();
    if (org) return "owner";

    // Check org_members table
    const { data: member } = await supabaseAdmin
      .from("crr_org_members")
      .select("role, status")
      .eq("org_id", orgId)
      .eq("user_id", opts.userId)
      .single();

    if (member && member.status === "active") {
      return member.role as OrgRole;
    }
  }

  return null;
}

/**
 * Check if a user has a specific permission. Returns true/false.
 * Logs the check to crr_rbac_audit if logAudit=true.
 */
export async function checkPermission(
  orgId: string,
  opts: { userId?: string; magicToken?: string },
  permission: Permission,
  logAudit = false
): Promise<boolean> {
  const role = await getEffectiveRole(orgId, opts);
  const allowed = role ? roleHasPermission(role, permission) : false;

  if (logAudit && opts.userId) {
    void supabaseAdmin.from("crr_rbac_audit").insert({
      org_id: orgId,
      actor_id: opts.userId ?? null,
      action: "access_check",
      result: allowed ? "allowed" : "denied",
      metadata: { permission, role: role ?? "none" },
    });
  }

  return allowed;
}

/**
 * Middleware helper: validate magic_token or Supabase session from request.
 * Returns { orgId, role } or throws if unauthorized.
 */
export async function getOrgAccess(
  req: { headers: { get: (k: string) => string | null }; nextUrl: { searchParams: URLSearchParams } },
  permission?: Permission
): Promise<{ orgId: string; orgSlug: string; role: OrgRole; via: "magic_token" | "session" }> {
  const token = req.headers.get("x-org-token") ?? req.nextUrl.searchParams.get("token");
  if (!token) throw new Error("Unauthorized: no token");

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, slug, magic_token")
    .eq("magic_token", token)
    .single();

  if (!org) throw new Error("Unauthorized: invalid token");

  const role: OrgRole = "owner"; // magic_token = owner

  if (permission && !roleHasPermission(role, permission)) {
    throw new Error(`Forbidden: requires ${permission}`);
  }

  return { orgId: org.id, orgSlug: org.slug, role, via: "magic_token" };
}

// ─── Member Management ────────────────────────────────────────────────────────

export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const { data } = await supabaseAdmin
    .from("crr_org_members")
    .select("*")
    .eq("org_id", orgId)
    .order("role", { ascending: true })
    .order("invited_at", { ascending: true });
  return (data ?? []) as OrgMember[];
}

export interface InviteResult {
  ok: boolean;
  member?: OrgMember;
  error?: string;
  invite_link?: string;
}

export async function inviteMember(
  orgId: string,
  email: string,
  role: OrgRole = "viewer",
  invitedByUserId?: string
): Promise<InviteResult> {
  email = email.toLowerCase().trim();

  // Check for existing invite
  const { data: existing } = await supabaseAdmin
    .from("crr_org_members")
    .select("id, status")
    .eq("org_id", orgId)
    .eq("email", email)
    .single();

  if (existing?.status === "active") {
    return { ok: false, error: "User is already an active member." };
  }

  // Upsert invite
  const { data, error } = await supabaseAdmin
    .from("crr_org_members")
    .upsert({
      org_id: orgId,
      email,
      role,
      status: "pending",
      invited_by: invitedByUserId ?? null,
      invited_at: new Date().toISOString(),
    }, { onConflict: "org_id,email" })
    .select()
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to invite" };

  // Generate invite link (they sign up at /auth/login?invite=<org_id>&email=<email>)
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://change-risk-radar.vercel.app";
  const invite_link = `${APP_URL}/auth/login?invite=${orgId}&email=${encodeURIComponent(email)}&role=${role}`;

  // Log audit
  void supabaseAdmin.from("crr_rbac_audit").insert({
    org_id: orgId,
    actor_id: invitedByUserId ?? null,
    action: "invite",
    target_email: email,
    target_role: role,
    result: "allowed",
  });

  return { ok: true, member: data as OrgMember, invite_link };
}

export async function updateMemberRole(
  orgId: string,
  memberId: string,
  newRole: OrgRole,
  actorUserId?: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("crr_org_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("org_id", orgId);

  if (error) return { ok: false, error: error.message };

  void supabaseAdmin.from("crr_rbac_audit").insert({
    org_id: orgId,
    actor_id: actorUserId ?? null,
    action: "role_change",
    target_role: newRole,
    result: "allowed",
    metadata: { member_id: memberId },
  });

  return { ok: true };
}

export async function revokeMember(
  orgId: string,
  memberId: string,
  actorUserId?: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("crr_org_members")
    .update({ status: "revoked" })
    .eq("id", memberId)
    .eq("org_id", orgId);

  if (error) return { ok: false, error: error.message };

  void supabaseAdmin.from("crr_rbac_audit").insert({
    org_id: orgId,
    actor_id: actorUserId ?? null,
    action: "revoke",
    result: "allowed",
    metadata: { member_id: memberId },
  });

  return { ok: true };
}

/**
 * Accept an invite — called when a user signs up/in via invite link.
 * Links their user_id to the pending member row.
 */
export async function acceptInvite(
  orgId: string,
  email: string,
  userId: string
): Promise<{ ok: boolean; role?: OrgRole; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from("crr_org_members")
    .update({
      user_id: userId,
      status: "active",
      accepted_at: new Date().toISOString(),
    })
    .eq("org_id", orgId)
    .eq("email", email)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !data) return { ok: false, error: "No pending invite found." };

  void supabaseAdmin.from("crr_rbac_audit").insert({
    org_id: orgId,
    actor_id: userId,
    actor_email: email,
    action: "accept",
    result: "allowed",
  });

  return { ok: true, role: data.role as OrgRole };
}

// ─── SSO Tracking ─────────────────────────────────────────────────────────────

export async function recordSSOLogin(
  orgId: string,
  provider: string,
  sub: string
): Promise<void> {
  await supabaseAdmin
    .from("crr_orgs")
    .update({
      sso_provider: provider,
      sso_sub: sub,
      last_login_at: new Date().toISOString(),
    })
    .eq("id", orgId);
}

// ─── Org Summary ──────────────────────────────────────────────────────────────

export async function getOrgTeamSummary(orgId: string) {
  const members = await getOrgMembers(orgId);
  return {
    total: members.length,
    active: members.filter(m => m.status === "active").length,
    pending: members.filter(m => m.status === "pending").length,
    by_role: {
      owner: members.filter(m => m.role === "owner").length,
      admin: members.filter(m => m.role === "admin").length,
      viewer: members.filter(m => m.role === "viewer").length,
    },
    members,
  };
}
