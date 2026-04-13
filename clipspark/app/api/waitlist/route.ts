import { NextRequest, NextResponse } from "next/server";
import { getContent, putContent } from "@/lib/github";
import { isValidEmail, hashIP } from "@/lib/utils";

const DATA_PATH = "clipspark/_data/waitlist.json";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, creator_type, audience_size, notes, honeypot } = body;

    // Honeypot check
    if (honeypot) {
      return NextResponse.json({ ok: true });
    }

    // Validate email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN!;
    const owner = process.env.GITHUB_OWNER!;
    const repo = process.env.GITHUB_REPO!;
    const branch = process.env.GITHUB_BRANCH || "main";
    const salt = process.env.SUBMISSION_SALT || "default-salt";

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ip_hash = await hashIP(ip, salt);
    const ts = new Date().toISOString();

    const record = {
      email,
      creator_type: creator_type || null,
      audience_size: audience_size || null,
      notes: notes || null,
      ts,
      ua: request.headers.get("user-agent") || "",
      ip_hash,
    };

    // Fetch existing data from GitHub
    const { data, sha } = await getContent(token, owner, repo, DATA_PATH, branch);
    let records: typeof record[] = [];
    if (data) {
      const decoded = Buffer.from(data.content, "base64").toString("utf-8");
      records = JSON.parse(decoded);
    }

    records.push(record);

    await putContent(
      token,
      owner,
      repo,
      DATA_PATH,
      JSON.stringify(records, null, 2),
      `chore(waitlist): +1 signup ${email} @ ${ts}`,
      sha,
      branch
    );

    // Optional email notification
    if (process.env.AGENTMAIL_API_KEY && process.env.AGENTMAIL_INBOX_EMAIL) {
      try {
        await fetch("https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
          },
          body: JSON.stringify({
            to: [process.env.AGENTMAIL_INBOX_EMAIL],
            subject: `New ClipSpark signup: ${email}`,
            text: `New waitlist signup!\n\nEmail: ${email}\nCreator type: ${creator_type || "not specified"}\nAudience size: ${audience_size || "not specified"}\nNotes: ${notes || "none"}\nTimestamp: ${ts}`,
          }),
        });
      } catch (e) {
        console.error("Email notification failed:", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Waitlist submission error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
