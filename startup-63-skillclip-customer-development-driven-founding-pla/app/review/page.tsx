"use client";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter, useSearchParams } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────
interface TimestampedNote { time: string; note: string; code_ref_id?: string }
interface CodeRef { id: string; code_standard: string; section: string; title: string; description: string; severity: "violation" | "warning" | "informational"; skill_tags: string[] }
interface ClipData {
  id: string; title: string; description: string; challenge_prompt: string;
  duration_seconds: number; storage_path: string; storage_bucket: string;
  skill_tags: string[]; created_at: string; status: string;
  uploader: { id: string; full_name: string; email: string; years_experience: number; bio: string }
  trade: { id: string; slug: string; name: string }
  region: { id: string; region_code: string; name: string; code_standard: string }
}
interface PendingReview { id: string; status: string; assigned_at: string; clip: ClipData & { uploader: { full_name: string } } }

const SEVERITY_STYLE: Record<string, string> = {
  violation:     "bg-red-50 border-red-300 text-red-800",
  warning:       "bg-amber-50 border-amber-300 text-amber-800",
  informational: "bg-blue-50 border-blue-200 text-blue-800",
}
const SEVERITY_BADGE: Record<string, string> = {
  violation:     "bg-red-100 text-red-700",
  warning:       "bg-amber-100 text-amber-700",
  informational: "bg-blue-100 text-blue-700",
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

// ── Main component ────────────────────────────────────────────────────────────
function ReviewPageInner() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialClipId = searchParams.get("clip_id")

  const videoRef = useRef<HTMLVideoElement>(null)
  const reviewStartRef = useRef<number>(Date.now())

  const [profileId, setProfileId] = useState<string | null>(null)
  const [profileName, setProfileName] = useState("")
  const [view, setView] = useState<"queue" | "review">(initialClipId ? "review" : "queue")

  // Queue view
  const [queue, setQueue] = useState<PendingReview[]>([])
  const [queueLoading, setQueueLoading] = useState(false)

  // Review view
  const [clip, setClip] = useState<ClipData | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [codeRefs, setCodeRefs] = useState<CodeRef[]>([])
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null)
  const [clipLoading, setClipLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Review form
  const [rating, setRating] = useState(4)
  const [skillLevel, setSkillLevel] = useState<"apprentice" | "journeyman" | "master">("journeyman")
  const [feedbackText, setFeedbackText] = useState("")
  const [compliancePass, setCompliancePass] = useState(true)
  const [jurisdictionNotes, setJurisdictionNotes] = useState("")
  const [promptAddressed, setPromptAddressed] = useState<boolean | null>(null)
  const [selectedCodeRefs, setSelectedCodeRefs] = useState<string[]>([])
  const [timestampedNotes, setTimestampedNotes] = useState<TimestampedNote[]>([])
  const [draftNote, setDraftNote] = useState("")
  const [draftNoteRef, setDraftNoteRef] = useState<string>("")
  const [issueBadge, setIssueBadge] = useState(false)
  const [badgeTitle, setBadgeTitle] = useState("")

  // Submit state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState("")

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return }
      const { data: prof } = await supabase.from("profiles").select("id,role,full_name").eq("user_id", user.id).single()
      if (!prof || prof.role !== "mentor") { router.push("/dashboard"); return }
      setProfileId(prof.id)
      setProfileName(prof.full_name || "Mentor")
    })
  }, [])

  // ── Load queue ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profileId || view !== "queue") return
    setQueueLoading(true)
    fetch(`/api/review?mentor_id=${profileId}`)
      .then(r => r.json())
      .then(d => { setQueue(Array.isArray(d) ? d : []); setQueueLoading(false) })
      .catch(() => setQueueLoading(false))
  }, [profileId, view])

  // ── Load clip for review ──────────────────────────────────────────────────
  const loadClip = useCallback(async (clipId: string) => {
    if (!profileId) return
    setClipLoading(true)
    reviewStartRef.current = Date.now()
    const res = await fetch(`/api/review?clip_id=${clipId}&mentor_id=${profileId}`)
    const data = await res.json()
    if (data.clip) {
      setClip(data.clip)
      setVideoUrl(data.video_url)
      setCodeRefs(data.code_refs || [])
      if (data.review) {
        setExistingReviewId(data.review.id)
        setRating(data.review.overall_rating || 4)
        setSkillLevel(data.review.skill_level || "journeyman")
        setFeedbackText(data.review.feedback_text || "")
        setCompliancePass(data.review.code_compliance_pass !== false)
        setJurisdictionNotes(data.review.jurisdiction_notes || "")
        setTimestampedNotes(data.review.timestamped_notes || [])
        setSelectedCodeRefs(data.review.code_reference_ids || [])
        setPromptAddressed(data.review.challenge_prompt_addressed ?? null)
      }
      // Pre-set jurisdiction notes from region code standard
      if (!data.review && data.clip.region?.code_standard) {
        setJurisdictionNotes(`Reviewed against ${data.clip.region.code_standard} for ${data.clip.region.name}.`)
      }
    }
    setView("review")
    setClipLoading(false)
  }, [profileId])

  useEffect(() => {
    if (profileId && initialClipId) loadClip(initialClipId)
  }, [profileId, initialClipId])

  // ── Capture timestamp ─────────────────────────────────────────────────────
  const captureTimestamp = useCallback(() => {
    if (!videoRef.current || !draftNote.trim()) return
    const t = fmtTime(videoRef.current.currentTime)
    setTimestampedNotes(prev => [...prev, { time: t, note: draftNote.trim(), code_ref_id: draftNoteRef || undefined }])
    setDraftNote("")
    setDraftNoteRef("")
  }, [draftNote, draftNoteRef])

  const removeNote = (i: number) => setTimestampedNotes(prev => prev.filter((_, j) => j !== i))

  // ── Code ref toggle ───────────────────────────────────────────────────────
  const toggleCodeRef = (id: string) =>
    setSelectedCodeRefs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!clip || !profileId || !feedbackText.trim()) return
    setSaving(true); setSaveError("")
    const durationSec = Math.round((Date.now() - reviewStartRef.current) / 1000)
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        review_id: existingReviewId,
        clip_id: clip.id,
        reviewer_id: profileId,
        overall_rating: rating,
        skill_level: skillLevel,
        feedback_text: feedbackText,
        code_compliance_pass: compliancePass,
        jurisdiction_notes: jurisdictionNotes,
        timestamped_notes: timestampedNotes,
        code_reference_ids: selectedCodeRefs,
        recommended_skill_level: skillLevel,
        challenge_prompt_addressed: promptAddressed,
        review_duration_seconds: durationSec,
        is_public: true,
        issue_badge: issueBadge,
        badge_title: badgeTitle || undefined,
        badge_type: "skill_verification",
        skill_tags: clip.skill_tags || [],
      }),
    })
    const data = await res.json()
    if (!res.ok) { setSaveError(data.error || "Save failed"); setSaving(false); return }
    setSaved(true)
    setSaving(false)
    setTimeout(() => { setSaved(false); setView("queue"); setClip(null); setVideoUrl(null); setTimestampedNotes([]); setFeedbackText(""); setSelectedCodeRefs([]); setIssueBadge(false); setBadgeTitle(""); setExistingReviewId(null); }, 2000)
  }

  // ── QUEUE VIEW ────────────────────────────────────────────────────────────
  if (view === "queue") {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mentor Review Queue</h1>
              <p className="text-gray-500 text-sm mt-0.5">Welcome back, {profileName}</p>
            </div>
            <div className="bg-blue-600 text-white text-sm px-4 py-2 rounded-full font-medium">
              {queue.length} pending
            </div>
          </div>

          {queueLoading ? (
            <div className="text-center text-gray-400 py-12 animate-pulse">Loading queue…</div>
          ) : queue.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-gray-600 font-medium">Queue is clear — all clips reviewed!</p>
              <p className="text-gray-400 text-sm mt-1">New assignments will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map(item => (
                <div key={item.id} onClick={() => loadClip(item.clip.id)}
                  className="bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{item.clip.title}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {item.clip.trade?.name} · {item.clip.region?.region_code} · {item.clip.duration_seconds}s
                      </div>
                      {item.clip.challenge_prompt && (
                        <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2 line-clamp-1">
                          🎯 {item.clip.challenge_prompt.slice(0, 100)}…
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 ml-4 text-right">
                      <div className="text-xs text-gray-400">{item.clip.uploader?.full_name}</div>
                      <div className="text-xs text-gray-400">{new Date(item.assigned_at).toLocaleDateString()}</div>
                      <div className="mt-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Review →</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── REVIEW VIEW ───────────────────────────────────────────────────────────
  if (clipLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center animate-pulse text-gray-400">Loading clip…</div>
  }

  if (!clip) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Clip not found</div>
  }

  const selectedRefs = codeRefs.filter(r => selectedCodeRefs.includes(r.id))

  return (
    <div className="min-h-screen bg-gray-100" suppressHydrationWarning>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => setView("queue")} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1.5">
          ← Queue
        </button>
        <div className="text-center">
          <div className="font-semibold text-gray-900 text-sm truncate max-w-xs">{clip.title}</div>
          <div className="text-xs text-gray-400">{clip.trade?.name} · {clip.region?.region_code} · {clip.region?.code_standard}</div>
        </div>
        <button onClick={handleSubmit} disabled={!feedbackText.trim() || saving || saved}
          className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${saved ? "bg-green-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"}`}>
          {saved ? "✓ Saved" : saving ? "Saving…" : "Submit Review"}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Left: Video + Uploader ── */}
        <div className="xl:col-span-2 space-y-4">
          {/* Video player */}
          <div className="bg-black rounded-xl overflow-hidden">
            {videoUrl ? (
              <video ref={videoRef} src={videoUrl} controls className="w-full max-h-[400px]"
                onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-3xl mb-2">🎬</div>
                  <div className="text-sm">Video preview (requires auth URL)</div>
                  <div className="text-xs text-gray-400 mt-1">Path: {clip.storage_path}</div>
                </div>
              </div>
            )}
          </div>

          {/* Challenge prompt */}
          {clip.challenge_prompt && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">🎯</span>
                <div>
                  <div className="font-semibold text-amber-900 text-sm mb-1">Challenge Prompt</div>
                  <p className="text-amber-800 text-sm leading-relaxed">{clip.challenge_prompt}</p>
                  <div className="flex gap-3 mt-3">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" name="prompt_addressed" checked={promptAddressed === true}
                        onChange={() => setPromptAddressed(true)}
                        className="text-green-600" />
                      <span className="text-green-800 font-medium">✓ Addressed</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" name="prompt_addressed" checked={promptAddressed === false}
                        onChange={() => setPromptAddressed(false)}
                        className="text-red-600" />
                      <span className="text-red-800 font-medium">✗ Not addressed</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="radio" name="prompt_addressed" checked={promptAddressed === null}
                        onChange={() => setPromptAddressed(null)}
                        className="text-gray-600" />
                      <span className="text-gray-600">Partial</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Uploader info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{clip.uploader?.full_name}</div>
                <div className="text-sm text-gray-500">{clip.uploader?.years_experience} years experience</div>
                {clip.uploader?.bio && <div className="text-xs text-gray-400 mt-1">{clip.uploader.bio}</div>}
              </div>
              <div className="text-right text-xs text-gray-400">
                <div>Uploaded {new Date(clip.created_at).toLocaleDateString()}</div>
                <div>{clip.duration_seconds}s · {Math.round((clip as any).file_size_bytes / 1024 / 1024)}MB</div>
                {clip.skill_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 justify-end">
                    {clip.skill_tags.map(t => <span key={t} className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-xs">{t}</span>)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timestamped notes panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              ⏱️ Timestamped Notes
              <span className="text-xs text-gray-400 font-normal">Current: {fmtTime(currentTime)}</span>
            </h3>

            {/* Existing notes */}
            {timestampedNotes.length > 0 && (
              <div className="space-y-2 mb-3">
                {timestampedNotes.map((note, i) => {
                  const ref = note.code_ref_id ? codeRefs.find(r => r.id === note.code_ref_id) : null
                  return (
                    <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2.5">
                      <button onClick={() => { if (videoRef.current) { const [m, s] = note.time.split(":").map(Number); videoRef.current.currentTime = m * 60 + s; videoRef.current.play() } }}
                        className="bg-blue-100 text-blue-700 text-xs font-mono px-2 py-0.5 rounded font-bold hover:bg-blue-200 flex-shrink-0">
                        {note.time}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">{note.note}</p>
                        {ref && <div className="text-xs text-purple-600 mt-0.5">📋 {ref.code_standard} §{ref.section}</div>}
                      </div>
                      <button onClick={() => removeNote(i)} className="text-gray-300 hover:text-red-400 flex-shrink-0">✕</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add note */}
            <div className="flex gap-2">
              <div className="flex-shrink-0 text-xs font-mono bg-gray-100 text-gray-600 px-2 py-2.5 rounded-lg">
                {fmtTime(currentTime)}
              </div>
              <input value={draftNote} onChange={e => setDraftNote(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); captureTimestamp() } }}
                placeholder="Type observation, then Enter or ▶ to capture at current timestamp…"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              <select value={draftNoteRef} onChange={e => setDraftNoteRef(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-2 text-xs focus:ring-2 focus:ring-blue-500 max-w-[120px]">
                <option value="">+ Code ref</option>
                {codeRefs.map(r => <option key={r.id} value={r.id}>{r.section}</option>)}
              </select>
              <button onClick={captureTimestamp} disabled={!draftNote.trim()}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                ▶
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Review Form + Code Refs ── */}
        <div className="space-y-4">
          {/* Rating */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Overall Rating</h3>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(star)}
                  className={`text-2xl transition-transform hover:scale-110 ${star <= rating ? "text-yellow-400" : "text-gray-200"}`}>★</button>
              ))}
              <span className="text-sm text-gray-500 ml-2 self-center">{rating}/5</span>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Skill Level Assessment</label>
            <div className="grid grid-cols-3 gap-2">
              {(["apprentice", "journeyman", "master"] as const).map(lvl => (
                <button key={lvl} onClick={() => setSkillLevel(lvl)}
                  className={`py-2 text-xs font-semibold rounded-lg border-2 capitalize transition-colors ${skillLevel === lvl ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Code compliance */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Code Compliance</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => setCompliancePass(true)}
                className={`py-2.5 text-sm font-semibold rounded-lg border-2 transition-colors ${compliancePass ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"}`}>
                ✓ Pass
              </button>
              <button onClick={() => setCompliancePass(false)}
                className={`py-2.5 text-sm font-semibold rounded-lg border-2 transition-colors ${!compliancePass ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200 text-gray-500"}`}>
                ✗ Fail
              </button>
            </div>
            <textarea value={jurisdictionNotes} onChange={e => setJurisdictionNotes(e.target.value)} rows={2}
              placeholder="Jurisdiction-specific notes (code standard, local amendments)…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* Code references */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              📋 Code References
              <span className="text-xs text-gray-400 font-normal">{codeRefs.length} available</span>
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {codeRefs.map(ref => (
                <div key={ref.id} onClick={() => toggleCodeRef(ref.id)}
                  className={`rounded-lg border p-2.5 cursor-pointer transition-all text-xs ${selectedCodeRefs.includes(ref.id) ? "border-purple-400 bg-purple-50" : `border ${SEVERITY_STYLE[ref.severity] || "border-gray-200"} hover:opacity-80`}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{ref.code_standard} §{ref.section}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${SEVERITY_BADGE[ref.severity]}`}>
                      {ref.severity}
                    </span>
                  </div>
                  <div className="text-gray-700 leading-tight font-medium">{ref.title}</div>
                  {selectedCodeRefs.includes(ref.id) && (
                    <div className="text-gray-500 mt-1 text-xs leading-tight">{ref.description.slice(0, 100)}…</div>
                  )}
                </div>
              ))}
            </div>
            {selectedCodeRefs.length > 0 && (
              <div className="mt-2 text-xs text-purple-700 font-medium">{selectedCodeRefs.length} reference{selectedCodeRefs.length > 1 ? "s" : ""} selected</div>
            )}
          </div>

          {/* Feedback text */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Mentor Feedback *</h3>
            <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={5}
              placeholder="Write your detailed feedback here. Address technique, code compliance, safety, and areas for improvement…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
            <div className="text-xs text-gray-400 text-right">{feedbackText.length} chars</div>
          </div>

          {/* Badge issuance */}
          <div className={`rounded-xl border-2 p-4 transition-colors ${issueBadge ? "border-yellow-400 bg-yellow-50" : "border-gray-200 bg-white"}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">🏅 Issue Badge</h3>
              <button onClick={() => setIssueBadge(!issueBadge)}
                className={`relative w-11 h-6 rounded-full transition-colors ${issueBadge ? "bg-yellow-400" : "bg-gray-300"}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${issueBadge ? "translate-x-5" : ""}`} />
              </button>
            </div>
            {issueBadge && (
              <div className="space-y-2">
                {!compliancePass && (
                  <div className="bg-red-50 text-red-700 text-xs p-2 rounded-lg">
                    ⚠️ Badge cannot be issued when code compliance is Fail.
                  </div>
                )}
                {compliancePass && rating < 3 && (
                  <div className="bg-amber-50 text-amber-700 text-xs p-2 rounded-lg">
                    ⚠️ Badge requires rating ≥ 3/5.
                  </div>
                )}
                {compliancePass && rating >= 3 && (
                  <>
                    <div className="text-xs text-yellow-800">
                      Badge will be issued to {clip.uploader?.full_name}'s wallet and recorded in the append-only ledger.
                    </div>
                    <input value={badgeTitle} onChange={e => setBadgeTitle(e.target.value)}
                      placeholder={`e.g., ${clip.trade?.name} — ${skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)} · ${clip.region?.region_code}`}
                      className="w-full border border-yellow-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-yellow-400 bg-white" />
                    <div className="flex flex-wrap gap-1">
                      {selectedRefs.slice(0, 3).map(r => (
                        <span key={r.id} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{r.section}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {saveError && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{saveError}</div>}

          <button onClick={handleSubmit} disabled={!feedbackText.trim() || saving || saved}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-colors ${saved ? "bg-green-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"}`}>
            {saved ? "✓ Review Submitted!" : saving ? "Submitting…" : issueBadge && compliancePass && rating >= 3 ? "Submit Review + Issue Badge 🏅" : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 animate-pulse">Loading…</div>}>
      <ReviewPageInner />
    </Suspense>
  )
}
