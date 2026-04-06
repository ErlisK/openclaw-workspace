interface PipelineStage {
  stage: string
  count: number
  pct: number
}

interface Props {
  pipeline: PipelineStage[]
}

const STAGE_COLORS = [
  { bar: 'bg-blue-400', text: 'text-blue-300' },
  { bar: 'bg-purple-400', text: 'text-purple-300' },
  { bar: 'bg-teal-400', text: 'text-teal-300' },
  { bar: 'bg-orange-400', text: 'text-orange-300' },
  { bar: 'bg-green-400', text: 'text-green-300' },
]

export default function PipelineFunnelChart({ pipeline }: Props) {
  const maxCount = pipeline[0]?.count ?? 1

  return (
    <div className="space-y-4">
      {pipeline.map((stage, i) => {
        const color = STAGE_COLORS[i] ?? STAGE_COLORS[STAGE_COLORS.length - 1]
        const drop = i > 0 ? pipeline[i - 1].count - stage.count : 0
        const dropPct = i > 0 && pipeline[i - 1].count > 0
          ? Math.round((drop / pipeline[i - 1].count) * 100)
          : null

        return (
          <div key={stage.stage}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono w-4 text-center ${color.text}`}>{i + 1}</span>
                <span className="text-sm font-medium">{stage.stage}</span>
                {dropPct !== null && dropPct > 0 && (
                  <span className="text-xs text-red-400/70 flex items-center gap-0.5">
                    ↓ {dropPct}% drop-off
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{stage.count} testers</span>
                <span className={`text-sm font-bold ${stage.pct >= 80 ? 'text-green-400' : stage.pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {stage.pct}%
                </span>
              </div>
            </div>
            <div className="h-6 bg-white/5 rounded-lg overflow-hidden relative">
              <div
                className={`h-full rounded-lg transition-all duration-700 ${color.bar} opacity-70`}
                style={{ width: `${stage.pct}%` }}
              />
              <div className="absolute inset-0 flex items-center px-3">
                <span className="text-xs font-medium text-white/80">
                  {stage.count} / {maxCount}
                </span>
              </div>
            </div>
          </div>
        )
      })}

      {/* Legend + success rate */}
      <div className="pt-3 border-t border-white/5 flex flex-wrap gap-4 text-xs text-gray-500">
        {pipeline.length >= 2 && (
          <span>
            Overall conversion: <strong className="text-white">
              {pipeline[pipeline.length - 1].count} / {pipeline[0].count}
              {' '}({pipeline[pipeline.length - 1].pct}%)
            </strong>
          </span>
        )}
        {pipeline.find(p => p.stage === 'Attended') && (
          <span>
            Show-up: <strong className={
              (pipeline.find(p => p.stage === 'Attended')?.pct ?? 0) >= 60
                ? 'text-green-400' : 'text-yellow-400'
            }>
              {pipeline.find(p => p.stage === 'Attended')?.pct}%
            </strong>
            {' '}(target ≥60%)
          </span>
        )}
        {pipeline.find(p => p.stage === 'Feedback') && pipeline.find(p => p.stage === 'Attended') && (
          <span>
            Survey rate: <strong className={
              Math.round((pipeline.find(p => p.stage === 'Feedback')!.count / (pipeline.find(p => p.stage === 'Attended')!.count || 1)) * 100) >= 80
                ? 'text-green-400' : 'text-yellow-400'
            }>
              {Math.round((pipeline.find(p => p.stage === 'Feedback')!.count / (pipeline.find(p => p.stage === 'Attended')!.count || 1)) * 100)}%
            </strong>
            {' '}(target ≥80%)
          </span>
        )}
      </div>
    </div>
  )
}
