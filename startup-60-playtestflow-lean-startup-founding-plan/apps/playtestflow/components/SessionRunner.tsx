'use client'

export default function SessionRunner({ runId, sessionId, signupId, testerId, timingBlocks, tasks, roles, runStatus, meetingUrl }: {
  runId: string
  sessionId: string
  signupId: string | null
  testerId: string | null
  timingBlocks: any[]
  tasks: any[]
  roles: any[]
  runStatus: string
  meetingUrl: string | null
}) {
  return (
    <div className="bg-white/4 border border-white/10 rounded-2xl p-6 text-center">
      <div className="text-3xl mb-3">🎮</div>
      <h2 className="font-bold text-lg mb-2">Session Runner</h2>
      <p className="text-gray-400 text-sm mb-4">
        {timingBlocks.length} phases · {tasks.length} tasks
      </p>
      {meetingUrl && (
        <a
          href={meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors"
        >
          Join Session →
        </a>
      )}
    </div>
  )
}
