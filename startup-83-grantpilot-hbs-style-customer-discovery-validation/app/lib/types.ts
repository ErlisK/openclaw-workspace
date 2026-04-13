export interface Persona {
  id: string
  name: string
  segment: string
  org_size_range: string
  annual_budget_range: string
  job_title: string
  pain_points: string[]
  goals: string[]
  purchase_triggers: string[]
  willingness_to_pay: string
  urgency_score: number
  ability_to_pay_score: number
  priority_rank: number
  attributes: Record<string, unknown>
  created_at: string
}

export interface Hypothesis {
  id: string
  version: number
  category: string
  hypothesis: string
  assumptions: string[]
  validation_method: string
  status: 'untested' | 'validated' | 'invalidated' | 'partial'
  evidence: string | null
  created_at: string
  updated_at: string
}

export interface Competitor {
  id: string
  name: string
  url: string
  category: string
  description: string
  strengths: string[]
  weaknesses: string[]
  pricing_model: string
  target_segment: string
  notes: string
  created_at: string
}

export interface ResearchItem {
  id: string
  source: string
  url: string
  title: string
  content: string
  tags: string[]
  signal_type: string
  persona_relevance: string[]
  sentiment: string
  created_at: string
}

export interface ResearchSource {
  id: string
  name: string
  url: string
  source_type: string
  description: string
  tags: string[]
  item_count: number
  created_at: string
}
