import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { computeProgress } from "@/lib/onboarding";
import SetupClient from "./SetupClient";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { orgSlug } = await params;
  const { token } = await searchParams;

  if (!token) redirect(`/dashboard/${orgSlug}?error=no_token`);

  const { data: org } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, name, email, slug, magic_token, activation_score, trial_ends_at")
    .eq("slug", orgSlug)
    .single();

  if (!org || org.magic_token !== token) redirect(`/dashboard/${orgSlug}?error=invalid_token`);

  const progress = await computeProgress(org.id);

  return (
    <SetupClient
      orgId={org.id}
      orgName={org.name}
      orgSlug={orgSlug}
      token={token}
      progress={progress}
    />
  );
}
