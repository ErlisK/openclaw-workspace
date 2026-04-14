export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("docsci_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <main id="main-content" className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <span className="font-bold text-xl text-white">DocsCI</span>
        </Link>
        <div className="flex gap-6 text-sm text-gray-400">
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/settings" className="text-white font-medium">Settings</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

        {/* Profile */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <p className="text-white bg-gray-800 rounded-lg px-4 py-3 text-sm">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
              <p className="text-white bg-gray-800 rounded-lg px-4 py-3 text-sm">
                {profile?.full_name || profile?.username || "—"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Member since</label>
              <p className="text-gray-400 bg-gray-800 rounded-lg px-4 py-3 text-sm">
                {new Date(user.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-gray-900 border border-red-900/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Delete account</p>
              <p className="text-gray-500 text-xs mt-0.5">Permanently delete your account and all data.</p>
            </div>
            <button
              disabled
              className="bg-red-900/40 text-red-400 px-4 py-2 rounded-lg text-sm font-medium opacity-60 cursor-not-allowed"
              title="Contact support to delete your account"
            >
              Delete account
            </button>
          </div>
        </section>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Need help? Email{" "}
            <a href="mailto:hello@snippetci.com" className="text-indigo-400 hover:text-indigo-300">
              hello@snippetci.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
