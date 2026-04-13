import { NextRequest, NextResponse } from "next/server";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const header = req.headers.get("x-admin-secret") || "";
  return header === ADMIN_SECRET || auth.replace("Bearer ", "") === ADMIN_SECRET;
}

async function supabaseQuery(path: string, params?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const url = `${supabaseUrl}/rest/v1/${path}${params ? `?${params}` : ""}`;
  const res = await fetch(url, {
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase error ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    // Page views — today
    let todayViews = 0, yesterdayViews = 0;
    let dailyTrend: Record<string, { views: number; leads: number }> = {};

    try {
      const pvToday = await supabaseQuery(
        "cc_page_views",
        `select=id,session_id,ts&ts=gte.${todayStart.toISOString()}&order=ts.asc`
      );
      todayViews = pvToday.length;

      const pvYesterday = await supabaseQuery(
        "cc_page_views",
        `select=id&ts=gte.${yesterdayStart.toISOString()}&ts=lt.${todayStart.toISOString()}`
      );
      yesterdayViews = pvYesterday.length;

      // Last 7 days breakdown
      const pv7 = await supabaseQuery(
        "cc_page_views",
        `select=ts&ts=gte.${sevenDaysAgo.toISOString()}&order=ts.asc`
      );
      for (const row of pv7) {
        const day = row.ts.slice(0, 10);
        if (!dailyTrend[day]) dailyTrend[day] = { views: 0, leads: 0 };
        dailyTrend[day].views++;
      }
    } catch {
      console.warn("[admin/metrics] cc_page_views table may not exist yet");
    }

    // Leads — today
    const leadsToday = await supabaseQuery(
      "cc_waitlist",
      `select=id,created_at&created_at=gte.${todayStart.toISOString()}`
    );
    const leadsYesterday = await supabaseQuery(
      "cc_waitlist",
      `select=id&created_at=gte.${yesterdayStart.toISOString()}&created_at=lt.${todayStart.toISOString()}`
    );

    // Last 7 days leads breakdown
    const leads7 = await supabaseQuery(
      "cc_waitlist",
      `select=created_at&created_at=gte.${sevenDaysAgo.toISOString()}&order=created_at.asc`
    );
    for (const row of leads7) {
      const day = row.created_at.slice(0, 10);
      if (!dailyTrend[day]) dailyTrend[day] = { views: 0, leads: 0 };
      dailyTrend[day].leads++;
    }

    // Recent 25 leads
    const recentLeads = await supabaseQuery(
      "cc_waitlist",
      `select=id,email,name,company,role,utm_source,utm_campaign,referrer,created_at&order=created_at.desc&limit=25`
    );

    // Total leads all time
    const allLeads = await supabaseQuery("cc_waitlist", "select=id");

    const todayLeadCount = leadsToday.length;
    const todayConversion = todayViews > 0 ? ((todayLeadCount / todayViews) * 100).toFixed(1) : "0.0";

    return NextResponse.json({
      summary: {
        today: {
          views: todayViews,
          leads: todayLeadCount,
          conversion: `${todayConversion}%`,
        },
        yesterday: {
          views: yesterdayViews,
          leads: leadsYesterday.length,
        },
        total_leads: allLeads.length,
      },
      daily_trend: Object.entries(dailyTrend)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data })),
      recent_leads: recentLeads,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
