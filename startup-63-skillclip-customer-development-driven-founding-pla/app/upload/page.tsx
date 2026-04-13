"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

const MAX_SIZE_MB = 50;
const MAX_DURATION_SECONDS = 90;
const MIN_DURATION_SECONDS = 10;

const CATEGORY_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  safety:         { emoji: "🦺", label: "Safety",         color: "bg-red-100 text-red-700 border-red-200" },
  technique:      { emoji: "🔧", label: "Technique",      color: "bg-blue-100 text-blue-700 border-blue-200" },
  code_compliance:{ emoji: "📋", label: "Code Compliance",color: "bg-purple-100 text-purple-700 border-purple-200" },
  tool_use:       { emoji: "🪛", label: "Tool Use",       color: "bg-amber-100 text-amber-700 border-amber-200" },
  measurement:    { emoji: "📐", label: "Measurement",    color: "bg-green-100 text-green-700 border-green-200" },
  documentation:  { emoji: "📝", label: "Documentation",  color: "bg-gray-100 text-gray-700 border-gray-200" },
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  apprentice: { label: "Apprentice", color: "bg-green-50 text-green-700" },
  journeyman: { label: "Journeyman", color: "bg-blue-50 text-blue-700" },
  master:     { label: "Master",     color: "bg-purple-50 text-purple-700" },
};

const TRADES = [
  { slug: "electrician",       label: "Electrician",         emoji: "⚡" },
  { slug: "plumber",           label: "Plumber",              emoji: "🔧" },
  { slug: "hvac-technician",   label: "HVAC Technician",      emoji: "❄️" },
  { slug: "welder",            label: "Welder",               emoji: "🔥" },
  { slug: "pipefitter",        label: "Pipefitter",           emoji: "🔩" },
  { slug: "carpenter",         label: "Carpenter",            emoji: "🪚" },
  { slug: "sheet-metal-worker",label: "Sheet Metal Worker",   emoji: "🏗️" },
  { slug: "ironworker",        label: "Ironworker",           emoji: "⚙️" },
];

const REGIONS = [
  { code: "US-TX", label: "Texas",     flag: "🤠", standard: "NEC 2020 + TDLR" },
  { code: "US-CA", label: "California",flag: "🌴", standard: "CEC 2022 + Title 24" },
  { code: "US-IL", label: "Illinois",  flag: "🌽", standard: "NEC 2020 + Chicago Code" },
  { code: "US-NY", label: "New York",  flag: "🗽", standard: "NYC Electrical Code" },
  { code: "US-FL", label: "Florida",   flag: "☀️", standard: "NEC 2020 + FBC" },
  { code: "US-WA", label: "Washington",flag: "🌲", standard: "NEC 2020 + WAC" },
];

type ChallengePrompt = {
  id: string | null;
  log_id: string | null;
  prompt_text: string;
  category: string;
  difficulty: string;
  skill_tags: string[];
  code_refs: string[];
  fallback: boolean;
};

export default function UploadPage() {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  // Trade / region / title / description
  const [tradeSlug, setTradeSlug] = useState("");
  const [tradeId, setTradeId] = useState<string | null>(null);
  const [regionCode, setRegionCode] = useState("");
  const [regionId, setRegionId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Challenge prompt
  const [prompt, setPrompt] = useState<ChallengePrompt | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [challengeConfirmed, setChallengeConfirmed] = useState(false);
  const [promptFetchedFor, setPromptFetchedFor] = useState<string>("");

  // Upload state
  const [step, setStep] = useState<"select" | "prompt" | "details" | "uploading" | "done">("select");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [uploadedClipId, setUploadedClipId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("id,role").eq("user_id", user.id).single();
      if (!data || data.role !== "tradesperson") { router.push("/dashboard"); return; }
      setProfileId(data.id);
    });
  }, []);

  // Fetch challenge prompt when trade + region are selected
  useEffect(() => {
    const key = `${tradeId}:${regionId}`;
    if (!tradeId || promptFetchedFor === key) return;
    setPromptLoading(true);
    setChallengeConfirmed(false);
    const params = new URLSearchParams({ trade_id: tradeId });
    if (regionId) params.set("region_id", regionId);
    if (profileId) params.set("uploader_id", profileId);
    fetch(`/api/challenge-prompt?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.prompt) { setPrompt(data.prompt); setPromptFetchedFor(key); }
        setPromptLoading(false);
      })
      .catch(() => setPromptLoading(false));
  }, [tradeId, regionId, profileId]);

  // Resolve trade_id when tradeSlug changes
  useEffect(() => {
    if (!tradeSlug) { setTradeId(null); return; }
    supabase.from("trades").select("id").eq("slug", tradeSlug).single()
      .then(({ data }) => setTradeId(data?.id || null));
  }, [tradeSlug]);

  // Resolve region_id when regionCode changes
  useEffect(() => {
    if (!regionCode) { setRegionId(null); return; }
    supabase.from("regions").select("id").eq("region_code", regionCode).single()
      .then(({ data }) => setRegionId(data?.id || null));
  }, [regionCode]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    if (!f.type.startsWith("video/")) { setError("Please select a video file."); return; }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Max ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(f);
    setFileSize(f.size);
    setVideoUrl(URL.createObjectURL(f));
  }, []);

  const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const d = Math.round(e.currentTarget.duration);
    setVideoDuration(d);
    if (d < MIN_DURATION_SECONDS) setError(`Too short (${d}s). Minimum ${MIN_DURATION_SECONDS}s.`);
    else if (d > MAX_DURATION_SECONDS) setError(`Too long (${d}s). Maximum ${MAX_DURATION_SECONDS}s.`);
    else setError("");
  };

  const refreshPrompt = () => {
    setPromptFetchedFor(""); // force re-fetch
    setPrompt(null);
    setChallengeConfirmed(false);
  };

  const handleUpload = async () => {
    if (!file || !profileId || !userId || !title || !tradeId) return;
    if (videoDuration && (videoDuration < MIN_DURATION_SECONDS || videoDuration > MAX_DURATION_SECONDS)) return;

    setUploading(true);
    setStep("uploading");
    setUploadProgress(10);
    setError("");
    const uploadStart = Date.now();

    try {
      const ext = file.name.split(".").pop() || "mp4";
      const sanitized = title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40);
      const storagePath = `${userId}/${Date.now()}-${sanitized}.${ext}`;
      setUploadProgress(20);

      const { error: uploadError } = await supabase.storage
        .from("clips").upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw new Error(uploadError.message);
      setUploadProgress(60);

      const { data: clip, error: dbError } = await supabase
        .from("clips").insert({
          uploader_id: profileId,
          title,
          description,
          trade_id: tradeId,
          region_id: regionId || null,
          storage_path: storagePath,
          storage_bucket: "clips",
          duration_seconds: videoDuration,
          file_size_bytes: fileSize,
          mime_type: file.type,
          status: "pending",
          challenge_prompt: prompt?.prompt_text || null,
          challenge_prompt_id: prompt?.id || null,
          prompt_issued_at: prompt ? new Date().toISOString() : null,
          skill_tags: selectedTags,
        }).select("id").single();

      if (dbError) throw new Error(dbError.message);
      setUploadProgress(90);

      // Mark prompt log as completed
      if (prompt?.log_id && clip?.id) {
        const responseTime = Math.round((Date.now() - uploadStart) / 1000);
        await fetch("/api/challenge-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ log_id: prompt.log_id, clip_id: clip.id, response_time_seconds: responseTime }),
        });
      }

      setUploadProgress(100);
      setUploadedClipId(clip?.id || null);
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setStep("details");
    } finally {
      setUploading(false);
    }
  };

  // ── Done screen ──────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎬</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Video Uploaded!</h1>
          <p className="text-gray-600 mb-6">Your clip is in the review queue. A vetted mentor will review it within 48 hours.</p>
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 text-left mb-6">
            <div className="font-semibold mb-1">What happens next:</div>
            <ul className="space-y-1 text-blue-700">
              <li>⭐ Mentor reviews and rates your technique</li>
              <li>📋 Code compliance check for {regionCode || "your region"}</li>
              <li>🏅 Eligible for jurisdiction-tagged badge</li>
              <li>🔍 Appears in employer search once reviewed</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setStep("select"); setFile(null); setVideoUrl(null); setTitle(""); setDescription(""); setTradeSlug(""); setRegionCode(""); setPrompt(null); setPromptFetchedFor(""); setChallengeConfirmed(false); setSelectedTags([]); }}
              className="bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 text-sm">
              Upload Another
            </button>
            <a href="/wallet" className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 text-sm text-center">
              View Wallet →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Uploading screen ─────────────────────────────────────────────────────
  if (step === "uploading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">⬆️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Uploading…</h2>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="text-gray-500 text-sm">{uploadProgress}% complete</p>
        </div>
      </div>
    );
  }

  const tradeInfo = TRADES.find(t => t.slug === tradeSlug);
  const regionInfo = REGIONS.find(r => r.code === regionCode);
  const catInfo = prompt ? CATEGORY_LABELS[prompt.category] : null;
  const diffInfo = prompt ? DIFFICULTY_LABELS[prompt.difficulty] : null;

  const canProceedToPrompt = !!file && !error && !!tradeSlug;
  const canUpload = canProceedToPrompt && !!title && (step === "details" || step === "prompt") && (!prompt || challengeConfirmed);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Upload Work Sample</h1>
          <p className="text-gray-500 mt-1 text-sm">10–90 second task video · Verified by a vetted local journeyman</p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 items-center justify-center mb-6">
          {["Select Video", "Challenge Prompt", "Details & Upload"].map((s, i) => {
            const idx = step === "select" ? 0 : step === "prompt" ? 1 : 2;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold ${idx > i ? "bg-green-500 text-white" : idx === i ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {idx > i ? "✓" : i + 1}
                </div>
                <span className={`text-xs ${idx === i ? "text-blue-600 font-medium" : "text-gray-400"}`}>{s}</span>
                {i < 2 && <div className="w-6 h-0.5 bg-gray-200" />}
              </div>
            );
          })}
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        {/* ── STEP 1: File + Trade + Region ── */}
        {(step === "select") && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            {/* Video upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Video File *</label>
              {!file ? (
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                  <div className="text-4xl mb-2">🎬</div>
                  <p className="text-gray-600 font-medium">Click to select video</p>
                  <p className="text-gray-400 text-sm mt-1">MP4, MOV, WebM · 10–90s · Max 50MB</p>
                  <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <video src={videoUrl!} controls className="w-full max-h-48 bg-black" onLoadedMetadata={handleVideoLoad} />
                  <div className="bg-gray-50 p-3 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {file.name} · {videoDuration ? `${videoDuration}s` : "…"} · {(fileSize! / 1024 / 1024).toFixed(1)}MB
                    </div>
                    <button onClick={() => { setFile(null); setVideoUrl(null); setVideoDuration(null); setError(""); }}
                      className="text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                </div>
              )}
            </div>

            {/* Trade selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Trade *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TRADES.map(t => (
                  <button key={t.slug} type="button" onClick={() => setTradeSlug(t.slug)}
                    className={`p-3 rounded-xl border-2 text-center transition-colors ${tradeSlug === t.slug ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <div className="text-xl mb-1">{t.emoji}</div>
                    <div className="text-xs font-medium text-gray-700 leading-tight">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Region selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Region / Jurisdiction</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {REGIONS.map(r => (
                  <button key={r.code} type="button" onClick={() => setRegionCode(r.code)}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${regionCode === r.code ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span>{r.flag}</span>
                      <span className="text-sm font-medium text-gray-800">{r.label}</span>
                    </div>
                    <div className="text-xs text-gray-400">{r.standard}</div>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep("prompt")} disabled={!canProceedToPrompt}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
              Next: Get Challenge Prompt →
            </button>
          </div>
        )}

        {/* ── STEP 2: Challenge Prompt ── */}
        {step === "prompt" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Your Challenge Prompt</h2>
                  <p className="text-gray-500 text-sm mt-0.5">
                    {tradeInfo?.emoji} {tradeInfo?.label}
                    {regionInfo && <> · {regionInfo.flag} {regionInfo.label}</>}
                  </p>
                </div>
                {prompt && (
                  <div className="flex gap-2 flex-shrink-0">
                    {catInfo && (
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${catInfo.color}`}>
                        {catInfo.emoji} {catInfo.label}
                      </span>
                    )}
                    {diffInfo && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${diffInfo.color}`}>
                        {diffInfo.label}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {promptLoading ? (
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                  <div className="animate-pulse text-gray-400">Loading trade-specific prompt…</div>
                </div>
              ) : prompt ? (
                <div>
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">🎯</span>
                      <p className="text-gray-800 font-medium leading-relaxed">{prompt.prompt_text}</p>
                    </div>
                  </div>

                  {prompt.code_refs && prompt.code_refs.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {prompt.code_refs.map(ref => (
                        <span key={ref} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded-full">
                          📋 {ref}
                        </span>
                      ))}
                    </div>
                  )}

                  {prompt.skill_tags && prompt.skill_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {prompt.skill_tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className={`rounded-xl p-4 border-2 cursor-pointer transition-all ${challengeConfirmed ? "bg-green-50 border-green-400" : "bg-gray-50 border-gray-200 hover:border-blue-300"}`}
                    onClick={() => setChallengeConfirmed(!challengeConfirmed)}>
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${challengeConfirmed ? "bg-green-500 border-green-500" : "border-gray-400"}`}>
                        {challengeConfirmed && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">I confirm my video addresses this prompt.</span>{" "}
                        I understand this challenge is recorded and my mentor reviewer will verify it matches my submission.
                      </p>
                    </div>
                  </div>

                  {!prompt.fallback && (
                    <button onClick={refreshPrompt} className="mt-3 text-xs text-gray-400 hover:text-blue-500 underline w-full text-center">
                      Request a different prompt (refresh)
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-gray-500 text-sm text-center">
                  No prompts found for this trade/region. You can proceed with a custom task description.
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("select")} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200">
                ← Back
              </button>
              <button onClick={() => setStep("details")} disabled={!!prompt && !challengeConfirmed}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
                Next: Add Details →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Details ── */}
        {step === "details" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Clip Details</h2>

            {/* Prompt reminder */}
            {prompt && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                <span className="font-semibold">📋 Prompt: </span>
                {prompt.prompt_text.slice(0, 120)}{prompt.prompt_text.length > 120 ? "…" : ""}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Clip Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder={`e.g., ${tradeInfo?.label || "Trade"} work sample — ${regionInfo?.label || "region"}`}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Task Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Describe what you did, the materials/tools used, and the code standards applicable…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Skill Tags (optional, max 5)</label>
              <div className="flex flex-wrap gap-2">
                {(prompt?.skill_tags || []).concat([
                  "3-phase wiring","conduit bending","load calculations","arc flash safety",
                  "PEX installation","backflow prevention","EPA 608 refrigerants","R-410A charging",
                  "pipe welding","structural welding","ASME IX","AWS D1.1",
                  "flanged joints","hydrostatic test",
                ]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 16).map(tag => (
                  <button key={tag} type="button" onClick={() =>
                    setSelectedTags(p => p.includes(tag) ? p.filter(t => t !== tag) : p.length < 5 ? [...p, tag] : p)}
                    className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${selectedTags.includes(tag) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-gray-300 text-gray-600"}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 flex flex-wrap gap-3 text-xs text-gray-500">
              <span>🎬 {file?.name}</span>
              <span>⏱️ {videoDuration}s</span>
              <span>📦 {(fileSize! / 1024 / 1024).toFixed(1)}MB</span>
              {tradeInfo && <span>{tradeInfo.emoji} {tradeInfo.label}</span>}
              {regionInfo && <span>{regionInfo.flag} {regionInfo.label}</span>}
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <div className="flex gap-3">
              <button onClick={() => setStep("prompt")} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200">
                ← Back
              </button>
              <button onClick={handleUpload} disabled={!title || !tradeId || uploading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
                🚀 Upload Clip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
