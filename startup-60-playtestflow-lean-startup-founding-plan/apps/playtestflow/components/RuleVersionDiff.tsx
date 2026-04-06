interface ChangeEntry {
  type: 'added' | 'changed' | 'fixed' | 'removed' | 'balance'
  section: string
  description: string
}

interface DiffData {
  fromVersion: { id: string; label: string; semver: string; summary: string } | null
  toVersion: { id: string; label: string; semver: string; summary: string; isBreakingChange: boolean; createdAt: string }
  changelog: ChangeEntry[]
  categorized: { added: ChangeEntry[]; changed: ChangeEntry[]; fixed: ChangeEntry[]; removed: ChangeEntry[]; balance: ChangeEntry[] }
  totalChanges: number
  hasChanges: boolean
  isFirstVersion: boolean
  isBreakingChange: boolean
}

interface Props {
  diff: DiffData | null
  compact?: boolean
  showHeader?: boolean
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  added:   { label: 'Added',   color: 'text-green-300',  bg: 'bg-green-500/10 border-green-500/20',   icon: '+' },
  changed: { label: 'Changed', color: 'text-blue-300',   bg: 'bg-blue-500/10 border-blue-500/20',     icon: '~' },
  fixed:   { label: 'Fixed',   color: 'text-purple-300', bg: 'bg-purple-500/10 border-purple-500/20', icon: '✓' },
  removed: { label: 'Removed', color: 'text-red-300',    bg: 'bg-red-500/10 border-red-500/20',       icon: '−' },
  balance: { label: 'Balance', color: 'text-yellow-300', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: '⚖' },
}

export default function RuleVersionDiff({ diff, compact = false, showHeader = true }: Props) {
  if (!diff) {
    return null
  }

  if (diff.isFirstVersion && !diff.hasChanges) {
    return (
      <div className="bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-400">
        📄 This is the initial version of the rulebook.
      </div>
    )
  }

  const { fromVersion, toVersion, categorized, isBreakingChange } = diff

  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {fromVersion ? (
              <>
                <span className="text-xs font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400">
                  v{fromVersion.semver}
                </span>
                <span className="text-gray-600 text-xs">→</span>
              </>
            ) : null}
            <span className="text-xs font-mono bg-orange-500/15 border border-orange-500/25 px-2 py-0.5 rounded text-orange-300 font-semibold">
              v{toVersion.semver}
            </span>
            {isBreakingChange && (
              <span className="text-[10px] bg-red-500/20 border border-red-500/30 text-red-300 px-2 py-0.5 rounded-full font-semibold">
                ⚠ Breaking changes
              </span>
            )}
          </div>
          {diff.totalChanges > 0 && (
            <span className="text-xs text-gray-500">{diff.totalChanges} change{diff.totalChanges !== 1 ? 's' : ''}</span>
          )}
        </div>
      )}

      {/* Summary line */}
      {toVersion.summary && (
        <p className="text-sm text-gray-300 italic">
          "{toVersion.summary}"
        </p>
      )}

      {/* Breaking change warning */}
      {isBreakingChange && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 text-sm text-red-300">
          <strong>⚠ This version has breaking changes</strong> — core mechanics have changed significantly from the previous version. Please re-read the full rulebook before playing.
        </div>
      )}

      {/* Changelog by category */}
      {diff.totalChanges > 0 && (
        <div className="space-y-2">
          {(['added', 'changed', 'balance', 'fixed', 'removed'] as const).map((type) => {
            const entries = categorized[type]
            if (entries.length === 0) return null
            const cfg = TYPE_CONFIG[type]
            return (
              <div key={type} className={`border rounded-xl overflow-hidden ${cfg.bg}`}>
                <div className={`px-3 py-1.5 flex items-center gap-2 border-b border-white/5`}>
                  <span className={`text-xs font-bold font-mono w-4 text-center ${cfg.color}`}>{cfg.icon}</span>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-xs text-gray-600 ml-auto">{entries.length}</span>
                </div>
                <ul className="divide-y divide-white/5">
                  {entries.map((entry, i) => (
                    <li key={i} className="px-4 py-2">
                      {!compact && entry.section && (
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-2">
                          {entry.section} ·
                        </span>
                      )}
                      <span className="text-sm text-gray-200">{entry.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {/* First version — no parent to diff against */}
      {diff.isFirstVersion && (
        <div className="text-xs text-gray-500 italic">
          No previous version — this is the first upload.
        </div>
      )}
    </div>
  )
}
