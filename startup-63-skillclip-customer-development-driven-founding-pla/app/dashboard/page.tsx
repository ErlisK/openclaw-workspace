"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Profile { id: string; full_name: string; role: string; email: string; onboarding_completed: boolean; }
interface Clip { id: string; title: string; status: string; created_at: string; duration_seconds: number | null; }
interface Review { id: string; clip_id: string; status: string; overall_rating: number | null; completed_at: string | null; }

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (!prof) { router.push("/profile/setup"); return; }
      if (!prof.onboarding_completed) { router.push("/profile/setup"); return; }
      setProfile(prof);

      if (prof.role === "tradesperson") {
        const { data: clipsData } = await supabase.from("clips").select("id,title,status,created_at,duration_seconds").eq("uploader_id", prof.id).order("created_at", { ascending: false }).limit(10);
        setClips(clipsData || []);
      }
      if (prof.role === "mentor") {
        const { data: reviewsData } = await supabase.from("reviews").select("id,clip_id,status,overall_rating,completed_at").eq("reviewer_id", prof.id).order("created_at", { ascending: false }).limit(10);
        setReviews(reviewsData || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <p className="text-gray-400">Loading dashboard...</p>
    </div>
  );

  const statusColor: Record<string, string> = {
    pending: "text-yellow-400 bg-yellow-400/10",
    under_review: "text-blue-400 bg-blue-400/10",
    reviewed: "text-green-400 bg-green-400/10",
    rejected: "text-red-400 bg-red-400/10",
    completed: "text-green-400 bg-green-400/10",
    in_progress: "text-blue-400 bg-blue-400/10",
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="text-xl font-black">Cert<span className="text-yellow-400">Clip</span></Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{profile?.email}</span>
          <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-white transition-colors">Sign out</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!</h1>
          <p className="text-gray-400 capitalize">{profile?.role} · {profile?.email}</p>
        </div>

        {/* Tradesperson view */}
        {profile?.role === "tradesperson" && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-3xl font-black text-yellow-400">{clips.length}</div>
                <div className="text-xs text-gray-500 mt-1">Total clips</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-3xl font-black text-green-400">{clips.filter(c => c.status === "reviewed").length}</div>
                <div className="text-xs text-gray-500 mt-1">Reviewed</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-3xl font-black text-blue-400">{clips.filter(c => c.status === "pending" || c.status === "under_review").length}</div>
                <div className="text-xs text-gray-500 mt-1">Pending review</div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Your clips</h2>
              <Link href="/upload" className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                + Upload clip
              </Link>
            </div>

            {clips.length === 0 ? (
              <div className="bg-white/5 border border-dashed border-white/20 rounded-xl p-10 text-center">
                <div className="text-4xl mb-3">🎬</div>
                <h3 className="font-bold mb-2">No clips yet</h3>
                <p className="text-gray-400 text-sm mb-5">Upload your first work sample to start building your verified portfolio.</p>
                <Link href="/upload" className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-6 py-3 rounded-xl transition-colors">
                  Upload your first clip →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {clips.map((clip) => (
                  <div key={clip.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{clip.title}</h3>
                      <p className="text-xs text-gray-500">{new Date(clip.created_at).toLocaleDateString()}{clip.duration_seconds ? ` · ${clip.duration_seconds}s` : ""}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColor[clip.status] || "text-gray-400 bg-white/5"}`}>
                      {clip.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Mentor view */}
        {profile?.role === "mentor" && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-3xl font-black text-yellow-400">{reviews.length}</div>
                <div className="text-xs text-gray-500 mt-1">Total reviews</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-3xl font-black text-green-400">{reviews.filter(r => r.status === "completed").length}</div>
                <div className="text-xs text-gray-500 mt-1">Completed</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-3xl font-black text-blue-400">{reviews.filter(r => r.status === "in_progress" || r.status === "pending").length}</div>
                <div className="text-xs text-gray-500 mt-1">In progress</div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Review queue</h2>
              <Link href="/review" className="bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors">
                Open queue →
              </Link>
            </div>
          </>
        )}

        {/* Employer / Staffing view */}
        {(profile?.role === "employer" || profile?.role === "staffing") && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h2 className="text-xl font-bold mb-2">Browse verified portfolios</h2>
            <p className="text-gray-400 text-sm mb-6">Search by trade, skill tag, and jurisdiction to find verified tradespeople.</p>
            <div className="inline-block bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-sm px-4 py-2 rounded-full">
              Portfolio search coming soon — you will be notified when ready
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
