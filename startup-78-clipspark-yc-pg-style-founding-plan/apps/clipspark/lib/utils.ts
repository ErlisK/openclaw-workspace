import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`
}

export function formatTAT(hours: number | null): string {
  if (!hours) return '—'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return `${hours.toFixed(1)}h`
}

export const PLATFORMS = [
  'YouTube Shorts',
  'TikTok',
  'Instagram Reels',
  'LinkedIn',
  'Twitter/X',
] as const

export const NICHES = [
  'business_podcast',
  'founder_podcast',
  'comedy',
  'fitness',
  'education',
  'coaching',
  'true_crime',
  'parenting',
  'tech_interview',
  'saas_founder',
] as const

export const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  ingested: 'Uploaded',
  proxying: 'Preparing',
  intake: 'Intake',
  transcribing: 'Transcribing',
  scoring: 'AI Scoring',
  rendering: 'Rendering',
  preview_ready: 'Preview Ready',
  qa: 'QA Review',
  delivered: 'Delivered',
  done: 'Done',
  posted: 'Posted',
  feedback_recv: 'Feedback Recv.',
  complete: 'Complete',
  cancelled: 'Cancelled',
  failed: 'Failed',
  error: 'Error',
}

export const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-gray-800 text-gray-400',
  ingested: 'bg-gray-700 text-gray-300',
  proxying: 'bg-blue-900 text-blue-300',
  intake: 'bg-gray-800 text-gray-300',
  transcribing: 'bg-blue-900 text-blue-300',
  scoring: 'bg-purple-900 text-purple-300',
  rendering: 'bg-yellow-900 text-yellow-300',
  preview_ready: 'bg-green-900 text-green-300',
  done: 'bg-green-800 text-green-200',
  qa: 'bg-orange-900 text-orange-300',
  delivered: 'bg-green-900 text-green-300',
  posted: 'bg-emerald-900 text-emerald-300',
  feedback_recv: 'bg-teal-900 text-teal-300',
  complete: 'bg-green-800 text-green-200',
  cancelled: 'bg-red-900 text-red-300',
  failed: 'bg-red-900 text-red-300',
  error: 'bg-red-800 text-red-200',
}
