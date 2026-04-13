import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendJsonl, todayPath } from "@/lib/github";
import { sendAlertEmail } from "@/lib/email";

export const runtime = "nodejs";

const LeadSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  organization: z.string().optional(),
  use_case: z.string().optional(),
  needs_compliance_review: z.boolean().optional(),
  utm: z
    .object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      term: z.string().optional(),
      content: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const sessionId = req.cookies.get("ccs_sid")?.value || "unknown";

    const lead = {
      full_name: data.full_name,
      email: data.email,
      organization: data.organization || null,
      use_case: data.use_case || null,
      needs_compliance_review: data.needs_compliance_review || false,
      utm: data.utm || {},
      referrer: req.headers.get("referer") || "",
      user_agent: req.headers.get("user-agent") || "",
      session_id: sessionId,
      timestamp: new Date().toISOString(),
    };

    await appendJsonl(todayPath("leads", "leads"), lead);

    const alertEmail = process.env.TEAM_ALERT_EMAIL;
    if (alertEmail) {
      sendAlertEmail({
        to: alertEmail,
        subject: `New Lead: ${data.full_name} (${data.email})`,
        text: `New ClaimCheck Studio lead:\nName: ${data.full_name}\nEmail: ${data.email}\nOrg: ${data.organization || "—"}\nCompliance: ${data.needs_compliance_review ? "Yes" : "No"}\nSubmitted: ${new Date().toISOString()}`,
      }).catch((e) => console.warn("[lead] Alert email failed:", e));
    } else {
      console.log("[lead] No TEAM_ALERT_EMAIL — skipping alert");
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[lead] error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
