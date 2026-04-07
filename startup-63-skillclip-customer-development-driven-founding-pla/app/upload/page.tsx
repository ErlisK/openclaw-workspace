"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";

const MAX_SIZE_MB = 50;
const MAX_DURATION_SECONDS = 90;
const MIN_DURATION_SECONDS = 10;

const CHALLENGE_PROMPTS = [
  "Show your tool setup and safety check before starting",
  "Demonstrate proper conduit bending to 90 degrees",
  "Show a wire connection following NEC color coding",
  "Demonstrate proper pipe fitting or soldering technique",
  "Show how you test a completed circuit before energizing",
  "Demonstrate your measurement and marking process",
  "Show the correct way to support conduit per code",
  "Demonstrate your personal protective equipment check",
];

const TRADES = ["Electrician","Plumber","HVAC Technician","Welder","Carpenter","Pipefitter","Sheet Metal Worker","Ironworker","Other"];
const SKILL_TAGS = ["3-phase wiring","PEX installation","arc flash safety","Title 24 compliance","EPA 608 refrigerants","backflow prevention","conduit bending","load calculations","service panel upgrade","gas fitting","hydronic heating","overhead TIG welding","pipe welding","structural welding"];

export default function UploadPage() {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [trade, setTrade] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [challengePrompt] = useState(() => CHALLENGE_PROMPTS[Math.floor(Math.random() * CHALLENGE_PROMPTS.length)]);
  const [challengeConfirmed, setChallengeConfirmed] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [fileSize, setFileSize] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("id,role").eq("user_id", user.id).single();
      if (!data || data.role !== "tradesperson") { router.push("/dashboard"); return; }
      setProfileId(data.id);
    });
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");

    // Check file type
    if (!f.type.startsWith("video/")) {
      setError("Please select a video file.");
      return;
    }

    // Check size (50MB limit)
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Maximum is ${MAX_SIZE_MB}MB.`);
      return;
    }

    setFile(f);
    setFileSize(f.size);
    const url = URL.createObjectURL(f);
    setVideoUrl(url);
  }, []);

  const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const duration = e.currentTarget.duration;
    setVideoDuration(Math.round(duration));
    if (duration < MIN_DURATION_SECONDS) {
      setError(`Video is too short (${Math.round(duration)}s). Minimum is ${MIN_DURATION_SECONDS} seconds.`);
    } else if (duration > MAX_DURATION_SECONDS) {
      setError(`Video is too long (${Math.round(duration)}s). Maximum is ${MAX_DURATION_SECONDS} seconds.`);
    } else {
      setError("");
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !profileId || !userId || !title || !challengeConfirmed) return;
    if (videoDuration && (videoDuration < MIN_DURATION_SECONDS || videoDuration > MAX_DURATION_SECONDS)) return;

    setUploading(true);
    setUploadProgress(10);
    setError("");

    try {
      // Generate unique storage path: userId/timestamp-title.mp4
      const ext = file.name.split(".").pop() || "mp4";
      const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40);
      const storagePath = `${userId}/${Date.now()}-${sanitizedTitle}.${ext}`;

      setUploadProgress(20);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("clips")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      setUploadProgress(70);

      // Create clip record in DB
      const { data: clip, error: dbError } = await supabase
        .from("clips")
        .insert({
          uploader_id: profileId,
          title,
          description: description || null,
          storage_path: storagePath,
          storage_bucket: "clips",
          duration_seconds: videoDuration,
          file_size_bytes: file.size,
          mime_type: file.type,
          status: "pending",
          task_description: description || null,
          challenge_prompt: challengePrompt,
        })
        .select("id")
        .single();

      if (dbError) throw new Error(`Database error: ${dbError.message}`);
      setUploadProgress(85);

      // Insert tags
      if (selectedTags.length > 0 && clip) {
        const { data: tagRows } = await supabase
          .from("interest_tags")
          .select("id,label")
          .in("label", selectedTags);

        if (tagRows && tagRows.length > 0) {
          await supabase.from("clip_interest_tags").insert(
            tagRows.map(t => ({ clip_id: clip.id, interest_tag_id: t.id }))
          );
        }
      }

      // Create pending review record
      if (clip) {
        await supabase.from("reviews").insert({
          clip_id: clip.id,
          status: "pending",
        });
      }

      setUploadProgress(100);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (done) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-white/5 border border-white/10 rounded-2xl p-10">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-black mb-3">Clip uploaded!</h2>
        <p className="text-gray-400 mb-2">Your clip is in the review queue. A vetted journeyman will review it within 48 hours.</p>
        <p className="text-gray-500 text-sm mb-8">You will receive an email when your review is complete.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-6 py-3 rounded-xl transition-colors">
            Go to dashboard
          </Link>
          <button onClick={() => { setDone(false); setFile(null); setVideoUrl(null); setTitle(""); setDescription(""); }}
            className="border border-white/20 hover:border-white/40 text-white font-medium px-6 py-3 rounded-xl transition-colors">
            Upload another
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f1117] text-white pb-20">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <Link href="/" className="text-xl font-black">Cert<span className="text-yellow-400">Clip</span></Link>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">← Dashboard</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-black mb-2">Upload a work sample</h1>
        <p className="text-gray-400 mb-8">10–90 seconds. Show real work. Get verified.</p>

        {/* Challenge prompt */}
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎲</span>
            <div>
              <h3 className="font-bold text-yellow-400 text-sm mb-1">Your randomized challenge prompt</h3>
              <p className="text-white font-medium">{challengePrompt}</p>
              <p className="text-gray-400 text-xs mt-2">Your clip should address this task. This proves authenticity — the prompt is assigned after you open this page.</p>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input type="checkbox" checked={challengeConfirmed} onChange={(e) => setChallengeConfirmed(e.target.checked)}
                  className="accent-yellow-400 w-4 h-4" />
                <span className="text-sm text-gray-300">My clip addresses this challenge prompt</span>
              </label>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          {/* File picker */}
          <div>
            <label className="block text-sm font-semibold mb-2">Video file <span className="text-red-400">*</span></label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                file ? "border-green-500/50 bg-green-500/5" : "border-white/20 hover:border-white/40"
              }`}
            >
              {file ? (
                <div>
                  <video
                    src={videoUrl!}
                    onLoadedMetadata={handleVideoLoad}
                    controls
                    className="w-full max-h-56 rounded-lg mb-3 object-contain"
                  />
                  <p className="text-sm font-medium text-green-400">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024 / 1024).toFixed(1)}MB
                    {videoDuration ? ` · ${videoDuration}s` : ""}
                  </p>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); setVideoUrl(null); setVideoDuration(null); }}
                    className="text-xs text-red-400 hover:text-red-300 mt-2 transition-colors">
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-3">🎬</div>
                  <p className="font-medium mb-1">Click to select a video</p>
                  <p className="text-xs text-gray-500">MP4, MOV, WebM · 10–90 seconds · Max 50MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-2">Clip title <span className="text-red-400">*</span></label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Conduit bending — 3/4 EMT, 90° offset"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors" />
          </div>

          {/* Trade */}
          <div>
            <label className="block text-sm font-semibold mb-2">Trade</label>
            <select value={trade} onChange={(e) => setTrade(e.target.value)}
              className="w-full bg-[#1a1d27] border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-400">
              <option value="">Select trade...</option>
              {TRADES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              What does this clip show? <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Bending 3/4 EMT conduit to 90 degrees in a commercial setting, following NEC 358 bending radius requirements..."
              rows={3}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 resize-none text-sm" />
          </div>

          {/* Skill tags */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Skill tags <span className="text-gray-500 font-normal">(select up to 5)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILL_TAGS.map(tag => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-yellow-400 border-yellow-400 text-black font-medium"
                      : "border-white/20 text-gray-400 hover:border-white/40"
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !file || !title || !challengeConfirmed || !!error}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-colors text-lg"
          >
            {uploading ? `Uploading... ${uploadProgress}%` : "Submit for Review →"}
          </button>

          <p className="text-xs text-gray-500 text-center">
            A vetted journeyman will review your clip within 48 hours. You will receive an email when complete.
          </p>
        </form>
      </div>
    </div>
  );
}
