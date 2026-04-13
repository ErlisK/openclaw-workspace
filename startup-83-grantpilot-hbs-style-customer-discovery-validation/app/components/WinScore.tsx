'use client'

import { useState } from 'react'

interface WinScoreFactor {
  key: string
  label: string
  score: number    // 0–100
  weight: number   // 0–1 (weights sum to 1)
  explanation: string
  status: 'strong' | 'good' | 'weak' | 'missing'
  action?: string
}

interface WinScoreProps {
  rfpId?: string
  applicationId?: string
  // Pre-computed factors from server (if available)
  factors?: WinScoreFactor[]
  // Basic signals we can derive client-side
  hasNarrative?: boolean
  hasBudget?: boolean
  hasChecklist?: boolean
  hasExport?: boolean
  hasQA?: boolean
  eligibilityConfidence?: 'high' | 'medium' | 'low'
  orgBudgetMatchesGrant?: boolean
  hasEIN?: boolean
  hasLocation?: boolean
  sectionsCompleted?: number
  totalSections?: number
  compact?: boolean
}

const FACTOR_META: Record<string, { label: string; weight: number; description: string }> = {
  eligibility: {
    label: 'Eligibility Match',
    weight: 0.25,
    description: 'How well your organization matches the funder\'s eligibility criteria',
  },
  narrative_completeness: {
    label: 'Narrative Completeness',
    weight: 0.20,
    description: 'Percentage of required narrative sections drafted',
  },
  budget_quality: {
    label: 'Budget Quality',
    weight: 0.15,
    description: 'Budget built, OMB-compliant, with justification narrative',
  },
  compliance: {
    label: 'Compliance & Forms',
    weight: 0.15,
    description: 'Required forms populated, checklist items addressed',
  },
  org_profile: {
    label: 'Organization Profile',
    weight: 0.10,
    description: 'EIN, location, org type, and funder focus areas configured',
  },
  qa_review: {
    label: 'Human QA Review',
    weight: 0.15,
    description: 'Specialist review completed before submission',
  },
}

function computeFactors(props: WinScoreProps): WinScoreFactor[] {
  const {
    hasNarrative = false,
    hasBudget = false,
    hasChecklist = false,
    hasExport = false,
    hasQA = false,
    eligibilityConfidence = 'medium',
    orgBudgetMatchesGrant = true,
    hasEIN = false,
    hasLocation = false,
    sectionsCompleted = 0,
    totalSections = 5,
  } = props

  const eligibilityScore = eligibilityConfidence === 'high' ? 90
    : eligibilityConfidence === 'medium' ? 60 : 30

  const narrativeScore = totalSections > 0
    ? Math.round((sectionsCompleted / totalSections) * 100)
    : (hasNarrative ? 50 : 0)

  const budgetScore = hasBudget ? 85 : 0

  const complianceScore = hasChecklist ? (hasExport ? 90 : 60) : (hasBudget ? 30 : 0)

  const profileScore = (hasEIN ? 40 : 0) + (hasLocation ? 30 : 0) + (orgBudgetMatchesGrant ? 30 : 0)

  const qaScore = hasQA ? 100 : (hasExport ? 40 : 0)

  return [
    {
      key: 'eligibility',
      label: FACTOR_META.eligibility.label,
      score: eligibilityScore,
      weight: FACTOR_META.eligibility.weight,
      explanation: eligibilityConfidence === 'high'
        ? 'Your organization meets the key eligibility criteria.'
        : eligibilityConfidence === 'medium'
        ? 'Eligibility is likely but some criteria need verification.'
        : 'Eligibility is uncertain — review the RFP requirements carefully.',
      status: eligibilityScore >= 80 ? 'strong' : eligibilityScore >= 50 ? 'good' : 'weak',
      action: eligibilityScore < 80 ? 'Review eligibility criteria in the RFP parser' : undefined,
    },
    {
      key: 'narrative_completeness',
      label: FACTOR_META.narrative_completeness.label,
      score: narrativeScore,
      weight: FACTOR_META.narrative_completeness.weight,
      explanation: totalSections > 0
        ? `${sectionsCompleted} of ${totalSections} required sections drafted.`
        : hasNarrative ? 'Narrative section started.' : 'No narrative sections drafted yet.',
      status: narrativeScore >= 80 ? 'strong' : narrativeScore >= 40 ? 'good' : narrativeScore > 0 ? 'weak' : 'missing',
      action: narrativeScore < 100 ? 'Complete remaining narrative sections' : undefined,
    },
    {
      key: 'budget_quality',
      label: FACTOR_META.budget_quality.label,
      score: budgetScore,
      weight: FACTOR_META.budget_quality.weight,
      explanation: hasBudget
        ? 'Budget built with OMB-compliant categories and justification.'
        : 'No budget built yet.',
      status: hasBudget ? 'strong' : 'missing',
      action: !hasBudget ? 'Build your grant budget in the Budget tab' : undefined,
    },
    {
      key: 'compliance',
      label: FACTOR_META.compliance.label,
      score: complianceScore,
      weight: FACTOR_META.compliance.weight,
      explanation: hasExport
        ? 'Forms completed, checklist verified, package exported.'
        : hasChecklist
        ? 'Compliance checklist generated. Complete remaining items.'
        : 'Compliance checklist not yet generated.',
      status: complianceScore >= 80 ? 'strong' : complianceScore >= 40 ? 'good' : complianceScore > 0 ? 'weak' : 'missing',
      action: !hasExport ? 'Complete checklist items and export package' : undefined,
    },
    {
      key: 'org_profile',
      label: FACTOR_META.org_profile.label,
      score: profileScore,
      weight: FACTOR_META.org_profile.weight,
      explanation: profileScore >= 80
        ? 'Organization profile complete with EIN, location, and funder focus.'
        : `Profile incomplete: ${!hasEIN ? 'EIN missing. ' : ''}${!hasLocation ? 'Location missing. ' : ''}`,
      status: profileScore >= 80 ? 'strong' : profileScore >= 50 ? 'good' : 'weak',
      action: profileScore < 80 ? 'Complete your org profile in Settings' : undefined,
    },
    {
      key: 'qa_review',
      label: FACTOR_META.qa_review.label,
      score: qaScore,
      weight: FACTOR_META.qa_review.weight,
      explanation: hasQA
        ? 'Specialist QA review completed. Application approved for submission.'
        : hasExport
        ? 'Package exported. Request specialist QA review before submitting.'
        : 'QA review available once narrative and budget are complete.',
      status: hasQA ? 'strong' : hasExport ? 'good' : 'weak',
      action: !hasQA ? 'Request human QA review (48-hour turnaround)' : undefined,
    },
  ]
}

function scoreToColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}

function scoreToBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-amber-400'
  return 'bg-red-400'
}

function statusIcon(status: WinScoreFactor['status']): string {
  switch (status) {
    case 'strong': return '✅'
    case 'good': return '🔶'
    case 'weak': return '⚠️'
    case 'missing': return '❌'
  }
}

export default function WinScore(props: WinScoreProps) {
  const [expanded, setExpanded] = useState(false)
  const factors = props.factors || computeFactors(props)

  // Weighted composite score
  const totalScore = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  )

  const scoreLabel = totalScore >= 80 ? 'Strong' : totalScore >= 60 ? 'Competitive' : totalScore >= 40 ? 'Developing' : 'Early stage'

  if (props.compact) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 mb-0.5">Win Score</div>
          <div className={`text-2xl font-extrabold tabular-nums ${scoreToColor(totalScore)}`}>
            {totalScore}<span className="text-sm font-medium text-gray-400">/100</span>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-indigo-600 hover:underline">
          {expanded ? 'Hide' : 'Details'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              🏆 Win Score
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                totalScore >= 80 ? 'bg-green-100 text-green-700' :
                totalScore >= 60 ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              }`}>{scoreLabel}</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Predictive score based on completeness and eligibility match
            </div>
          </div>
          <div className={`text-3xl font-extrabold tabular-nums ${scoreToColor(totalScore)}`}>
            {totalScore}<span className="text-sm font-normal text-gray-400">/100</span>
          </div>
        </div>

        {/* Main progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-700 ${scoreToBarColor(totalScore)}`}
            style={{ width: `${totalScore}%` }}
          />
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="divide-y divide-gray-50">
        {factors.map(factor => (
          <div key={factor.key} className="px-5 py-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{statusIcon(factor.status)}</span>
                <span className="text-sm font-medium text-gray-900">{factor.label}</span>
                <span className="text-xs text-gray-400">({Math.round(factor.weight * 100)}% weight)</span>
              </div>
              <span className={`text-sm font-bold tabular-nums ${scoreToColor(factor.score)}`}>
                {factor.score}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1 mb-1.5">
              <div
                className={`h-1 rounded-full transition-all ${scoreToBarColor(factor.score)}`}
                style={{ width: `${factor.score}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{factor.explanation}</p>
            {factor.action && (
              <div className="mt-1.5 text-xs text-indigo-600 font-medium">
                → {factor.action}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Score explanation */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400 leading-relaxed">
          Win Score estimates your application&apos;s competitiveness based on completeness, eligibility match, and QA review status. It is not a guarantee of funding — funder priorities and competition vary. Scores above 80 indicate submission-ready applications.
        </p>
      </div>
    </div>
  )
}
