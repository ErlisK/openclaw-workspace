/**
 * GET  /api/onboarding?token= — get onboarding progress for org
 * POST /api/onboarding — mark a step complete
 *   body: { step: OnboardingStepId, metadata?: {} }
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { computeProgress, markStepComplete, CHECKLIST_STEPS } from "@/lib/onboarding";
import type { OnboardingStepId } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

async function getOrg(req: NextRequest) {
  const token = req.headers.get("x-org-token") ?? req.nextUrl.searchParams.get("token");
  if (!token) return null;
  const { data } = await supabaseAdmin
    .from("crr_orgs")
    .select("id, slug, name, magic_token")
    .eq("magic_token", token)
    .single();
  return data;
}

export async function GET(req: NextRequest) {
  const org = await getOrg(req);
  if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const progress = await computeProgress(org.id);

  return NextResponse.json({
    ok: true,
    progress,
    steps_definition: CHECKLIST_STEPS,
  });
}

export async function POST(req: NextRequest) {
  const org = await getOrg(req);
  if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { step?: string; metadata?: Record<string, unknown> };
  const { step, metadata = {} } = body;

  if (!step) return NextResponse.json({ error: "step required" }, { status: 400 });

  const validSteps = CHECKLIST_STEPS.map(s => s.id);
  if (!validSteps.includes(step as OnboardingStepId)) {
    return NextResponse.json({ error: `step must be one of: ${validSteps.join(", ")}` }, { status: 400 });
  }

  await markStepComplete(org.id, step as OnboardingStepId, metadata);

  const progress = await computeProgress(org.id);
  return NextResponse.json({ ok: true, progress });
}
