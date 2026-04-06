'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function RuleUploader({ projectId }: { projectId: string }) {
  const [versionLabel, setVersionLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      if (!versionLabel) {
        // Auto-suggest version label from filename
        const base = f.name.replace(/\.[^.]+$/, '')
        const match = base.match(/v?\d+[\.\d]*/i)
        if (match) setVersionLabel(match[0])
      }
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !versionLabel) return
    setUploading(true)
    setError('')
    setProgress(10)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setUploading(false); return }

    // Upload to storage: {userId}/{projectId}/{versionLabel}/{filename}
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${user.id}/${projectId}/${versionLabel}/${safeName}`

    setProgress(30)
    const { error: uploadErr } = await supabase.storage
      .from('rule-uploads')
      .upload(storagePath, file, { upsert: true, contentType: file.type })

    if (uploadErr) {
      setError(uploadErr.message)
      setUploading(false)
      setProgress(0)
      return
    }

    setProgress(70)

    // Record the version in DB
    const { error: dbErr } = await supabase.from('rule_versions').insert({
      project_id: projectId,
      version_label: versionLabel,
      storage_path: storagePath,
      file_name: file.name,
      file_size_bytes: file.size,
      notes: notes || null,
      uploaded_by: user.id,
    })

    if (dbErr) {
      setError(dbErr.message)
      setUploading(false)
      setProgress(0)
      return
    }

    setProgress(100)
    setFile(null)
    setVersionLabel('')
    setNotes('')
    if (fileRef.current) fileRef.current.value = ''
    setTimeout(() => { setProgress(0); router.refresh() }, 500)
  }

  return (
    <form onSubmit={handleUpload} className="bg-white/[0.03] border border-white/10 rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Version label <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            required
            placeholder="v1.3"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">PDF / Image</label>
          <input
            ref={fileRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg"
            required
            className="w-full text-xs text-gray-400 bg-white/5 border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-orange-500/20 file:text-orange-400 file:text-xs cursor-pointer"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Change notes <span className="text-gray-600">(optional)</span>
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Rebalanced combat actions, fixed ambiguous wording in rulebook §3"
          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      {progress > 0 && progress < 100 && (
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      <button
        type="submit"
        disabled={uploading || !file || !versionLabel}
        className="w-full bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/30 disabled:opacity-40 text-orange-400 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {uploading ? `Uploading… ${progress}%` : '⬆ Upload Rule Version'}
      </button>
    </form>
  )
}
