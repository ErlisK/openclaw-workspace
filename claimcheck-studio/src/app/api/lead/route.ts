import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
import path from "path";

const LeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  company: z.string().optional(),
  role: z.string().optional(),
  use_case: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  referrer: z.string().optional(),
});

function getRepoFullName(): string {
  if (process.env.GITHUB_REPO_FULL_NAME) {
    return process.env.GITHUB_REPO_FULL_NAME;
  }
  if (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG) {
    return `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`;
  }
  // Local dev fallback: parse .git/config one level up
  try {
    const gitConfigPath = path.resolve(process.cwd(), "../.git/config");
    const config = execSync(`git -C ${path.resolve(process.cwd(), "..")} remote get-url origin`, {
      encoding: "utf8",
    }).trim();
    const match = config.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) return `${match[1]}/${match[2]}`;
  } catch {}
  return "ErlisK/openclaw-workspace";
}

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
    const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Server misconfiguration" }, { status: 500 });
    }

    const repoFullName = getRepoFullName();
    const [owner, repo] = repoFullName.split("/");

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const timestamp = new Date().toISOString();

    const issueBody = `## New Lead: ClaimCheck Studio

| Field | Value |
|-------|-------|
| **Name** | ${data.name} |
| **Email** | ${data.email} |
| **Company** | ${data.company || "—"} |
| **Role** | ${data.role || "—"} |
| **Use Case** | ${data.use_case || "—"} |
| **UTM Source** | ${data.utm_source || "—"} |
| **UTM Medium** | ${data.utm_medium || "—"} |
| **UTM Campaign** | ${data.utm_campaign || "—"} |
| **Referrer** | ${data.referrer || "—"} |
| **IP** | ${ip} |
| **User Agent** | ${userAgent} |
| **Timestamp** | ${timestamp} |
`;

    const octokit = new Octokit({ auth: token });

    await octokit.issues.create({
      owner,
      repo,
      title: `Lead: ${data.email} — ClaimCheck Studio`,
      body: issueBody,
      labels: ["lead", "claimcheck-studio"],
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("Lead capture error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
