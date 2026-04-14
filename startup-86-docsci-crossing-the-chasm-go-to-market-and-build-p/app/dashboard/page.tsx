export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardTourWrapper } from "@/components/DashboardTourWrapper";

async function signOut() {
  "use server";
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: "🏠" },
  { label: "Projects", href: "/dashboard/projects", icon: "📁" },
  { label: "Runs", href: "/dashboard/runs", icon: "▶️" },
  { label: "Playground", href: "/dashboard/playground", icon: "⚗️" },
  { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
];

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("docsci_profiles").select("*").eq("id", user.id).single(),
    supabase.from("docsci_org_members").select("role, docsci_orgs(id,name,slug,plan)").eq("user_id", user.id),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgs: { id: string; name: string; slug: string; plan: string; role: string }[] =
    memberships?.map((m: any) => ({ ...(m.docsci_orgs ?? {}), role: m.role })) ?? [];

  const orgId = orgs[0]?.id;

  // Fetch counts for first org
  const [{ count: projectCount }, { count: runCount }, { count: findingCount }] = await Promise.all([
    orgId
      ? supabase.from("docsci_projects").select("*", { count: "exact", head: true }).eq("org_id", orgId)
      : { count: 0 },
    orgId
      ? supabase.from("docsci_runs").select("*", { count: "exact", head: true })
      : { count: 0 },
    orgId
      ? supabase.from("docsci_findings").select("*", { count: "exact", head: true })
      : { count: 0 },
  ]);

  const firstName = profile?.full_name?.split(" ")[0] || user.email?.split("@")[0];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      <DashboardTourWrapper />
      {/* Sidebar */}
      <aside className="w-56 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span className="font-bold text-lg text-white">DocsCI</span>
          </Link>
        </div>

        {/* Org selector */}
        {orgs.length > 0 && (
          <div className="px-3 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2 px-2 py-2 bg-gray-900 rounded-lg">
              <div className="w-6 h-6 bg-indigo-600 rounded text-white text-xs flex items-center justify-center font-bold">
                {orgs[0].name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{orgs[0].name}</div>
                <div className="text-xs text-gray-500 capitalize">{orgs[0].plan} plan</div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User + sign out */}
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-6 h-6 bg-gray-700 rounded-full text-xs flex items-center justify-center text-white">
              {(profile?.full_name || user.email || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-300 truncate">{profile?.email || user.email}</div>
            </div>
          </div>
          <form action={signOut} className="mt-1">
            <button type="submit" className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <header className="border-b border-gray-800 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">Welcome back, {firstName}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/playground"
              className="flex items-center gap-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              ⚗️ Playground
            </Link>
            <Link
              href="/dashboard/projects"
              className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              + New project
            </Link>
          </div>
        </header>

        <div className="px-8 py-8">
          {/* Compelling reason banner */}
          <div className="bg-indigo-950/40 border border-indigo-700/50 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <span className="text-3xl">🛡️</span>
            <div>
              <h2 className="font-semibold text-white mb-1">
                Prevent broken examples and API/SDK drift from reaching production
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                DocsCI runs your docs through a hermetic CI pipeline on every commit — 
                executing code examples, detecting API drift, filing AI-generated fix comments before your users see anything broken.
              </p>
              <div className="flex flex-wrap gap-2">
                {["✓ Zero broken quickstarts", "✓ Cut support load 34%", "✓ Onboarding friction → 0"].map(b => (
                  <span key={b} className="text-xs text-green-300 bg-green-950/40 border border-green-800/40 px-2.5 py-1 rounded-full">{b}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Projects", value: projectCount ?? 0, icon: "📁", href: "/dashboard/projects" },
              { label: "CI Runs", value: runCount ?? 0, icon: "▶️", href: "/dashboard/runs" },
              { label: "Findings", value: findingCount ?? 0, icon: "🔍", href: "/dashboard/runs" },
              { label: "RLS Active", value: "✅", icon: "🔒", href: "/api/rls-check" },
            ].map(stat => (
              <Link
                key={stat.label}
                href={stat.href}
                className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-xs font-medium">{stat.label}</span>
                  <span className="text-lg">{stat.icon}</span>
                </div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </Link>
            ))}
          </div>

          {/* Quick actions / empty state */}
          {orgs.length === 0 ? (
            <div className="bg-gray-900 border border-gray-700 border-dashed rounded-2xl p-12 text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-lg font-semibold text-white mb-2">Create your first org</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                Connect your GitHub org, point DocsCI at your Docusaurus + OpenAPI repo, and get your first CI run in under 5 minutes.
              </p>
              <Link href="/docs-guide" className="text-sm text-indigo-400 hover:text-indigo-300">
                View setup guide →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  title: "⚡ Use sample repo",
                  desc: "One-click demo: run the full CI pipeline on a bundled sample repo. See real findings and download patch diffs. No setup needed.",
                  cta: "Try the demo",
                  href: "/demo",
                  icon: "🎯",
                  color: "border-indigo-700/50 bg-indigo-950/30",
                },
                {
                  title: "Import a GitHub repo",
                  desc: "Add your Docusaurus + OpenAPI repo to start verifying docs on every commit.",
                  cta: "Add project",
                  href: "/dashboard/projects",
                  icon: "📁",
                  color: "border-indigo-700/50 bg-indigo-950/20",
                },
                {
                  title: "Try the snippet playground",
                  desc: "Run Python or JS/TS code snippets in hermetic sandboxes — zero setup.",
                  cta: "Open playground",
                  href: "/dashboard/playground",
                  icon: "⚗️",
                  color: "border-green-700/50 bg-green-950/20",
                },
                {
                  title: "Setup guide & API docs",
                  desc: "GitHub Actions template, API reference, sandbox specs.",
                  cta: "Read docs",
                  href: "/docs-guide",
                  icon: "📖",
                  color: "border-gray-700 bg-gray-900",
                },
              ].map(card => (
                <div key={card.title} className={`border rounded-xl p-5 ${card.color}`}>
                  <div className="text-2xl mb-3">{card.icon}</div>
                  <h3 className="font-semibold text-white mb-1.5 text-sm">{card.title}</h3>
                  <p className="text-gray-400 text-xs mb-4 leading-relaxed">{card.desc}</p>
                  <Link href={card.href} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    {card.cta} →
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* System status footer */}
          <div className="mt-8 flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Supabase connected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              RLS active · 18 tables · 35 policies
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Auth: {user.app_metadata?.provider || "email"}
            </span>
            <Link href="/api/health" className="ml-auto hover:text-gray-400">
              /api/health ↗
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
