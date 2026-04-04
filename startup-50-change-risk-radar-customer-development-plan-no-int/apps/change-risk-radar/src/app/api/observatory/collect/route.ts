import { NextRequest, NextResponse } from "next/server";
import { runFullCollection } from "@/lib/observatory";

// Allow long-running collection
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Auth check for cron
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "crr-cron-2025";
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runFullCollection();
    return NextResponse.json({ 
      success: true, 
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Collection error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Vercel cron handler — Vercel calls GET for cron jobs
export async function GET(req: NextRequest) {
  // Allow Vercel cron (no auth header from Vercel, uses CRON_SECRET env)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "crr-cron-2025";
  
  // Check Vercel cron signature OR bearer token
  if (authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runFullCollection();
    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Collection error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
