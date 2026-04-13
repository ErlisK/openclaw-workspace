'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface Event {
  id: string
  event_type: string
  tester_id: string | null
  elapsed_seconds: number | null
  failure_point: boolean
  task_id: string | null
  timing_block_id: string | null
  event_data: Record<string, any>
  created_at: string
}

interface TaskStat {
  task_id: string
  label: string
  count: number
  avg_time: number | null
  failure_count: number
  confusion_count: number
}

interface Props {
  sessionId: string
  templateTasks?: Array<{ id: string; label: string }>
  timingBlocks?: Array<{ id: string; label: string; duration_minutes: number }>
}

const EVENT_COLORS: Record<string, string> = {
  task_start: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  task_complete: 'bg-green-500/20 text-green-300 border-green-500/30',
  task_stuck: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  rule_confusion: 'bg-red-500/20 text-red-300 border-red-500/30',
  decision_made: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  session_start: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  session_end: 'bg-orange-500/10 text-orange-400/60 border-orange-500/20',
  consent_given: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  survey_completed: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  signup_submitted: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
}

function fmtTime(s: number) {
  if (s < 60) return `${Math.round(s)}s`
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

export default function EventsTimeline({ sessionId, templateTasks = [], timingBlocks = [] }: Props) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [liveMode, setLiveMode] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)

  // Initial load
  useEffect(() => {
    fetch(`/api/events?session_id=${sessionId}&limit=500`)
      .then(r => r.json())
      .then(d => {
        setEvents(d.events ?? [])
        setLoading(false)
      })
  }, [sessionId])

  // Realtime subscription
  useEffect(() => {
    if (!liveMode) {
      channelRef.current?.unsubscribe()
      return
    }

    const supabase = createClient()
    const channel = supabase
      .channel(`events:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setEvents(prev => [...prev, payload.new as Event])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .subscribe()

    channelRef.current = channel
    return () => { channel.unsubscribe() }
  }, [liveMode, sessionId])

  // Compute task stats
  const taskStats: TaskStat[] = templateTasks.map(task => {
    const taskEvents = events.filter(e => e.task_id === task.id)
    const completions = taskEvents.filter(e => e.event_type === 'task_complete')
    const times = completions.map(e => e.elapsed_seconds).filter(t => t != null) as number[]
    return {
      task_id: task.id,
      label: task.label,
      count: completions.length,
      avg_time: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null,
      failure_count: taskEvents.filter(e => e.failure_point).length,
      confusion_count: taskEvents.filter(e => e.event_type === 'rule_confusion').length,
    }
  })

  // General stats
  const totalEvents = events.length
  const failureEvents = events.filter(e => e.failure_point)
  const confusionEvents = events.filter(e => e.event_type === 'rule_confusion')
  const uniqueTesters = new Set(events.map(e => e.tester_id).filter(Boolean)).size

  const filtered = filter === 'all' ? events : events.filter(e => e.event_type === filter)
  const eventTypes = [...new Set(events.map(e => e.event_type))].sort()

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total events', value: totalEvents },
          { label: 'Active testers', value: uniqueTesters },
          { label: 'Failure points', value: failureEvents.length, warn: failureEvents.length > 0 },
          { label: 'Confusion flags', value: confusionEvents.length, warn: confusionEvents.length > 3 },
        ].map(stat => (
          <div key={stat.label} className={`bg-white/4 border rounded-xl p-4 ${stat.warn ? 'border-yellow-500/30' : 'border-white/10'}`}>
            <div className={`text-2xl font-bold ${stat.warn ? 'text-yellow-400' : ''}`}>{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Task performance table */}
      {taskStats.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Task Performance</h3>
          <div className="bg-white/4 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500">
                  <th className="text-left px-4 py-2">Task</th>
                  <th className="text-right px-4 py-2">Completions</th>
                  <th className="text-right px-4 py-2">Avg time</th>
                  <th className="text-right px-4 py-2">Failures</th>
                  <th className="text-right px-4 py-2">Confusion</th>
                </tr>
              </thead>
              <tbody>
                {taskStats.map(ts => (
                  <tr key={ts.task_id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2 font-medium truncate max-w-[200px]">{ts.label}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{ts.count}</td>
                    <td className="px-4 py-2 text-right text-gray-400">
                      {ts.avg_time != null ? fmtTime(ts.avg_time) : '—'}
                    </td>
                    <td className={`px-4 py-2 text-right ${ts.failure_count > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                      {ts.failure_count}
                    </td>
                    <td className={`px-4 py-2 text-right ${ts.confusion_count > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                      {ts.confusion_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timeline header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-gray-400">Event Timeline</h3>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs"
          >
            <option value="all">All events ({totalEvents})</option>
            {eventTypes.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={liveMode}
              onChange={e => setLiveMode(e.target.checked)}
              className="accent-orange-500"
            />
            <span className={liveMode ? 'text-green-400' : ''}>
              {liveMode ? '🟢 Live' : 'Live mode'}
            </span>
          </label>
        </div>
      </div>

      {/* Timeline list */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {loading && (
          <div className="text-center text-gray-500 text-sm py-8">Loading events…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-gray-600 text-sm py-8">
            No events yet. Events are ingested via <code className="text-orange-400/70 text-xs">POST /api/events</code>.
          </div>
        )}
        {filtered.map(ev => {
          const color = EVENT_COLORS[ev.event_type] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
          const ts = new Date(ev.created_at)
          return (
            <div key={ev.id} className={`flex items-start gap-3 border rounded-lg px-3 py-2.5 ${color}`}>
              <div className="shrink-0 text-xs font-mono opacity-60 pt-0.5 w-20">
                {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">{ev.event_type.replace(/_/g, ' ')}</span>
                  {ev.tester_id && (
                    <span className="text-[10px] opacity-60 font-mono">{ev.tester_id.slice(0, 12)}…</span>
                  )}
                  {ev.elapsed_seconds != null && (
                    <span className="text-[10px] opacity-70">⏱ {fmtTime(ev.elapsed_seconds)}</span>
                  )}
                  {ev.failure_point && (
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-1.5 py-0.5 rounded-full">failure</span>
                  )}
                </div>
                {Object.keys(ev.event_data ?? {}).length > 0 && (
                  <p className="text-[11px] opacity-70 mt-0.5 truncate">
                    {JSON.stringify(ev.event_data)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
