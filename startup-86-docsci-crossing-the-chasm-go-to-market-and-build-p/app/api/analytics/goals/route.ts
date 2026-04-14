/**
 * GET /api/analytics/goals
 *
 * Returns goal metrics for core product conversion events.
 * Goals tracked:
 *   - project_created  (alias: project.created)
 *   - run_completed    (alias: run.completed)
 *   - patch_downloaded (alias: patch.downloaded, patch_downloaded)
 *   - user_signup      (alias: user.signup)
 *   - template_viewed  (alias: template.viewed)
 *
 * Response:
 * {
 *   goals: [
 *     {
 *       id, label, event_name, target_30d,
 *       count_all_time, count_30d, count_7d, count_today,
 *       pct_of_target, trend_pct
 *     }
 *   ],
 *   funnel: { signups, projects_created, runs_completed, patches_downloaded },
 *   seeded_events: [...recent events from docsci_events],
 *   last_updated: ISO string
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const GOALS = [
  {
    id: "project_created",
    label: "Projects Created",
    events: ["project.created", "project_created"],
    target_30d: 50,
    description: "Number of new DocsCI projects created in 30 days. Proxy for activated orgs.",
    icon: "📁",
  },
  {
    id: "run_completed",
    label: "Runs Completed",
    events: ["run.completed", "run_completed"],
    target_30d: 500,
    description: "Number of CI runs that completed (pass or fail). Measures product engagement.",
    icon: "✅",
  },
  {
    id: "patch_downloaded",
    label: "Patches Downloaded",
    events: ["patch.downloaded", "patch_downloaded"],
    target_30d: 100,
    description: "Number of AI-generated patch diffs downloaded. Measures AI value delivery.",
    icon: "🔧",
  },
  {
    id: "user_signup",
    label: "User Signups",
    events: ["user.signup", "user_signup"],
    target_30d: 30,
    description: "New user registrations. Top of funnel.",
    icon: "👤",
  },
  {
    id: "template_viewed",
    label: "Templates Viewed",
    events: ["template.viewed", "template_viewed"],
    target_30d: 200,
    description: "CI YAML template page views. SEO and activation intent signal.",
    icon: "📄",
  },
];

function svc() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!,
  );
}

async function countEvents(
  db: ReturnType<typeof svc>,
  eventNames: string[],
  sinceDays: number | null,
): Promise<number> {
  let query = db
    .from("docsci_events")
    .select("id", { count: "exact", head: true })
    .in("event_name", eventNames);
  if (sinceDays !== null) {
    const since = new Date(Date.now() - sinceDays * 86400_000).toISOString();
    query = query.gte("created_at", since);
  }
  const { count } = await query;
  return count ?? 0;
}

export async function GET(_req: NextRequest) {
  try {
    const db = svc();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build goal metrics
    const goalResults = await Promise.all(
      GOALS.map(async (g) => {
        const [all_time, count_30d, count_7d, count_today, prev_30d] = await Promise.all([
          countEvents(db, g.events, null),
          countEvents(db, g.events, 30),
          countEvents(db, g.events, 7),
          countEvents(db, g.events, 1),
          countEvents(db, g.events, 60).then(n60 => countEvents(db, g.events, 30).then(n30 => n60 - n30)),
        ]);
        const trend_pct = prev_30d > 0 ? Math.round(((count_30d - prev_30d) / prev_30d) * 100) : null;
        return {
          id: g.id,
          label: g.label,
          description: g.description,
          icon: g.icon,
          event_names: g.events,
          target_30d: g.target_30d,
          count_all_time: all_time,
          count_30d,
          count_7d,
          count_today,
          pct_of_target: Math.min(100, Math.round((count_30d / g.target_30d) * 100)),
          trend_pct,
        };
      })
    );

    // Recent events
    const { data: recentEvents } = await db
      .from("docsci_events")
      .select("id, event_name, distinct_id, org_id, project_id, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      goals: goalResults,
      funnel: {
        signups: goalResults.find(g => g.id === "user_signup")?.count_30d ?? 0,
        projects_created: goalResults.find(g => g.id === "project_created")?.count_30d ?? 0,
        runs_completed: goalResults.find(g => g.id === "run_completed")?.count_30d ?? 0,
        patches_downloaded: goalResults.find(g => g.id === "patch_downloaded")?.count_30d ?? 0,
      },
      recent_events: recentEvents ?? [],
      last_updated: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, goals: [], recent_events: [], funnel: {} }, { status: 500 });
  }
}
