"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ClipWithReview {
  review_id: string;
  review_status: string;
  clip_id: string;
  clip_title: string;
  clip_description: string | null;
  clip_duration: number | null;
  clip_challenge: string | null;
  uploader_name: string | null;
  trade_name: string | null;
  created_at: string;
}

interface ReviewForm {
  overall_rating: number;
  skill_level: "apprentice" | "journeyman" | "master";
  feedback_text: string;
  code_compliance_pass: boolean;
  jurisdiction_notes: string;
  timestamped_notes: { time: string; note: string }[];
}

export default function ReviewPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clips, setClips] = useState<ClipWithReview[]>([]);
  const [selected, setSelected] = useState<ClipWithReview | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [form, setForm] = useState<ReviewForm>({
    overall_rating: 3,
    skill_level: "journeyman",
    feedback_text: "",
    code_compliance_pass: true,
    jurisdiction_notes: "",
    timestamped_notes: [],
  });
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [newNote, setNewNote] = useState("");
  const [newNoteTime, setNewNoteTime] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("id,role").eq("user_id", user.id).single();
      if (!prof || prof.role !== "mentor") { router.push("/dashboard"); return; }
      setProfileId(prof.id);

      // Load pending reviews with clip info
      const { data: reviews } = await supabase
        .from("reviews")
        .select(`
          id,
          status,
          clips (
            id,
            title,
            description,
            duration_seconds,
            challenge_prompt,
            storage_path,
            storage_bucket,
            profiles ( full_name ),
            trades ( name )
          )
        `)
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: true })
        .limit(20);

      if (reviews) {
        const mapped: ClipWithReview[] = reviews
          .filter(r => r.clips)
          .map((r: any) => ({
            review_id: r.id,
            review_status: r.status,
            clip_id: r.clips.id,
            clip_title: r.clips.title,
            clip_description: r.clips.description,
            clip_duration: r.clips.duration_seconds,
            clip_challenge: r.clips.challenge_prompt,
            uploader_name: r.clips.profiles?.full_name || null,
            trade_name: r.clips.trades?.name || null,
            created_at: r.created_at,
          }));
        setClips(mapped);
      }
      setLoading(false);
    });
  }, [savedCount]);

  const loadVideo = async (clip: ClipWithReview) => {
    setSelected(clip);
    setVideoUrl(null);

    // Claim the review
    await supabase.from("reviews").update({
      status: "in_progress",
      reviewer_id: profileId,
      assigned_at: new Date().toISOString(),
    }).eq("id", clip.review_id);

    // Get signed URL for video
    const { data } = await supabase.storage
      .from("clips")
      .createSignedUrl(clip.clip_id + "/" + clip.clip_title, 3600); // fallback
    
    // Actually use storage_path from clip
    const { data: signedData } = await supabase.storage
      .from("clips")
      .createSignedUrl(clip.clip_id, 3600);
    
    // Get the actual path from the clips table
    const { data: clipData } = await supabase.from("clips").select("storage_path").eq("id", clip.clip_id).single();
    if (clipData?.storage_path) {
      const { data: urlData } = await supabase.storage.from("clips").createSignedUrl(clipData.storage_path, 3600);
      if (urlData?.signedUrl) setVideoUrl(urlData.signedUrl);
    }
  };

  const addNote = () => {
    if (!newNote) return;
    setForm(f => ({
      ...f,
      timestamped_notes: [...f.timestamped_notes, { time: newNoteTime || "0:00", note: newNote }],
    }));
    setNewNote("");
    setNewNoteTime("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !profileId) return;
    if (!form.feedback_text) { return; }
    setSaving(true);

    const { error } = await supabase.from("reviews").update({
      reviewer_id: profileId,
      status: "completed",
      overall_rating: form.overall_rating,
      skill_level: form.skill_level,
      feedback_text: form.feedback_text,
      code_compliance_pass: form.code_compliance_pass,
      jurisdiction_notes: form.jurisdiction_notes || null,
      timestamped_notes: form.timestamped_notes,
      is_public: true,
      completed_at: new Date().toISOString(),
    }).eq("id", selected.review_id);

    if (!error) {
      // Update clip status
      await supabase.from("clips").update({ status: "reviewed" }).eq("id", selected.clip_id);

      // Issue a badge
      await supabase.from("badges").insert({
        profile_id: (await supabase.from("clips").select("uploader_id").eq("id", selected.clip_id).single()).data?.uploader_id,
        clip_id: selected.clip_id,
        review_id: selected.review_id,
        badge_type: "skill",
        title: `Verified: ${selected.clip_title}`,
        description: `Reviewed by a vetted journeyman. Skill level: ${form.skill_level}.`,
        issued_by: profileId,
        issued_at: new Date().toISOString(),
      });

      setSelected(null);
      setVideoUrl(null);
      setForm({ overall_rating: 3, skill_level: "journeyman", feedback_text: "", code_compliance_pass: true, jurisdiction_notes: "", timestamped_notes: [] });
      setSavedCount(c => c + 1);
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <p className="text-gray-400">Loading review queue...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-black">Cert<span className="text-yellow-400">Clip</span></Link>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">← Dashboard</Link>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-black mb-2">Mentor Review Queue</h1>
        <p className="text-gray-400 mb-8">{clips.length} clip{clips.length !== 1 ? "s" : ""} awaiting review</p>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Queue */}
          <div>
            <h2 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-4">Pending Clips</h2>
            {clips.length === 0 ? (
              <div className="bg-white/5 border border-dashed border-white/20 rounded-xl p-8 text-center text-gray-400">
                <p className="text-3xl mb-3">✅</p>
                <p>Queue is empty — all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clips.map((clip) => (
                  <div key={clip.review_id}
                    onClick={() => loadVideo(clip)}
                    className={`bg-white/5 border rounded-xl p-4 cursor-pointer transition-all ${
                      selected?.review_id === clip.review_id ? "border-yellow-400/60 bg-yellow-400/5" : "border-white/10 hover:border-white/30"
                    }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">{clip.clip_title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {clip.uploader_name || "Unknown"} · {clip.trade_name || "Unknown trade"}
                          {clip.clip_duration ? ` · ${clip.clip_duration}s` : ""}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        clip.review_status === "in_progress" ? "bg-blue-400/10 text-blue-400" : "bg-yellow-400/10 text-yellow-400"
                      }`}>
                        {clip.review_status === "in_progress" ? "In progress" : "Pending"}
                      </span>
                    </div>
                    {clip.clip_challenge && (
                      <p className="text-xs text-gray-500 mt-2 italic truncate">Prompt: {clip.clip_challenge}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review panel */}
          <div>
            {!selected ? (
              <div className="bg-white/5 border border-dashed border-white/20 rounded-xl p-10 text-center text-gray-400">
                <p className="text-3xl mb-3">👆</p>
                <p className="text-sm">Select a clip from the queue to review it</p>
              </div>
            ) : (
              <div>
                <h2 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-4">Review: {selected.clip_title}</h2>

                {/* Video player */}
                <div className="bg-black rounded-xl overflow-hidden mb-5 aspect-video flex items-center justify-center">
                  {videoUrl ? (
                    <video src={videoUrl} controls className="w-full h-full object-contain" />
                  ) : (
                    <p className="text-gray-500 text-sm">Loading video...</p>
                  )}
                </div>

                {/* Challenge prompt reminder */}
                {selected.clip_challenge && (
                  <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3 mb-5 text-sm">
                    <span className="text-yellow-400 font-medium">Challenge prompt: </span>
                    <span className="text-gray-300">{selected.clip_challenge}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Rating */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Overall rating</label>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} type="button"
                          onClick={() => setForm(f => ({ ...f, overall_rating: n }))}
                          className={`w-10 h-10 rounded-lg border font-bold transition-all ${
                            form.overall_rating >= n ? "bg-yellow-400 border-yellow-400 text-black" : "border-white/20 text-gray-500"
                          }`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Skill level */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Assessed skill level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["apprentice","journeyman","master"] as const).map(level => (
                        <button key={level} type="button"
                          onClick={() => setForm(f => ({ ...f, skill_level: level }))}
                          className={`py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                            form.skill_level === level ? "bg-blue-500 border-blue-500 text-white" : "border-white/20 text-gray-400 hover:border-white/40"
                          }`}>
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Code compliance */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Code compliance</label>
                    <div className="flex gap-3">
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, code_compliance_pass: true }))}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                          form.code_compliance_pass ? "bg-green-500/20 border-green-500/50 text-green-400" : "border-white/20 text-gray-400"
                        }`}>
                        ✓ Pass
                      </button>
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, code_compliance_pass: false }))}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                          !form.code_compliance_pass ? "bg-red-500/20 border-red-500/50 text-red-400" : "border-white/20 text-gray-400"
                        }`}>
                        ✗ Fail
                      </button>
                    </div>
                  </div>

                  {/* Timestamped notes */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Timestamped notes</label>
                    <div className="space-y-2 mb-2">
                      {form.timestamped_notes.map((n, i) => (
                        <div key={i} className="flex gap-2 text-xs bg-white/5 rounded-lg px-3 py-2">
                          <span className="text-yellow-400 font-mono">{n.time}</span>
                          <span className="text-gray-300">{n.note}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={newNoteTime} onChange={(e) => setNewNoteTime(e.target.value)}
                        placeholder="0:30" className="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-xs font-mono text-center focus:outline-none focus:border-yellow-400" />
                      <input value={newNote} onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Note at this timestamp..."
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-yellow-400" />
                      <button type="button" onClick={addNote}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 px-3 rounded-lg text-sm transition-colors">
                        +
                      </button>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Overall feedback <span className="text-red-400">*</span></label>
                    <textarea required value={form.feedback_text}
                      onChange={(e) => setForm(f => ({ ...f, feedback_text: e.target.value }))}
                      placeholder="Provide constructive feedback on technique, safety, code compliance, and skill level demonstrated..."
                      rows={4}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 resize-none text-sm" />
                  </div>

                  {/* Jurisdiction notes */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Jurisdiction/code notes <span className="text-gray-500 font-normal">(optional)</span>
                    </label>
                    <input value={form.jurisdiction_notes}
                      onChange={(e) => setForm(f => ({ ...f, jurisdiction_notes: e.target.value }))}
                      placeholder="e.g. Technique matches NEC 2020 §358.24 requirements"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 text-sm" />
                  </div>

                  <button type="submit" disabled={saving || !form.feedback_text}
                    className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-bold py-3 rounded-xl transition-colors">
                    {saving ? "Submitting..." : "Submit Review & Issue Badge →"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
