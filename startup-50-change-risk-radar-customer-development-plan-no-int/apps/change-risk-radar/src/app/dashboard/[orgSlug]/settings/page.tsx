import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { getOrgTeamSummary } from "@/lib/rbac";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ token?: string; tab?: string }>;
}) {
  const { orgSlug } = await params;
  const { token, tab } = await searchParams;

  if (!token) redirect(`/auth/login?redirect=/dashboard/${orgSlug}/settings`);

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, name, email, slug, magic_token, billing_plan, status, sso_provider, privacy_mode, trial_ends_at")
    .eq("slug", orgSlug)
    .single();

  if (!org || org.magic_token !== token) redirect(`/dashboard/${orgSlug}?error=invalid_token`);

  const team = await getOrgTeamSummary(org.id);

  const { data: sub } = await supabaseAdmin
    .from("crr_subscriptions")
    .select("plan_id, status, trial_end")
    .eq("org_id", org.id)
    .single();

  return (
    <SettingsClient
      orgId={org.id}
      orgName={org.name}
      orgEmail={org.email}
      orgSlug={orgSlug}
      token={token}
      team={team}
      plan={sub?.plan_id ?? org.billing_plan ?? "trial"}
      planStatus={sub?.status ?? org.status}
      ssoProvider={org.sso_provider ?? null}
      privacyMode={org.privacy_mode ?? true}
      initialTab={(tab as "team" | "security" | "sso") ?? "team"}
    />
  );
}
