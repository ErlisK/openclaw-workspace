/**
 * POST /api/ai/chat
 * Grant Pilot AI assistant — streaming chat for grant strategy Q&A.
 * Uses Vercel AI Gateway, compatible with useChat() hook.
 */
import { NextRequest } from 'next/server'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { createClient, createAdminClient } from '@/lib/supabase'
import { defaultModel } from '@/lib/ai-gateway'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const admin = createAdminClient()
    const body = await req.json()
    const { messages, context }: { messages: UIMessage[]; context?: Record<string, unknown> } = body

    // Load org context for personalization
    const { data: member } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    let orgContext = ''
    if (member) {
      const { data: org } = await admin
        .from('organizations')
        .select('name, org_type, annual_budget_usd, grant_focus_areas, city, state')
        .eq('id', member.organization_id)
        .single()
      if (org) {
        orgContext = `
The user's organization:
- Name: ${org.name || 'Unknown'}
- Type: ${org.org_type || 'Nonprofit'}
- Budget: ${org.annual_budget_usd ? `$${org.annual_budget_usd.toLocaleString()}` : 'Not specified'}
- Focus: ${(org.grant_focus_areas || []).join(', ') || 'Not specified'}
- Location: ${[org.city, org.state].filter(Boolean).join(', ') || 'Not specified'}
`
      }
    }

    const contextStr = context ? `\n\nCurrent page context: ${JSON.stringify(context)}` : ''

    const result = streamText({
      model: defaultModel,
      system: `You are Grant Pilot, an expert AI grant consultant helping nonprofits, neighborhood associations, and municipal teams win grants.

Your expertise includes:
- Federal, state, foundation, and corporate grant programs
- Grant writing strategy and narrative structure
- Budget development and compliance (OMB Uniform Guidance, 2 CFR 200)
- RFP analysis and win probability assessment
- CFDA/SAM.gov, Grants.gov, and foundation portals
- Outcome measurement and logic models
- Common grant writing mistakes to avoid

${orgContext}${contextStr}

Be specific, actionable, and data-driven. When you don't know something, say so and suggest how to find it.
Keep responses concise but thorough. Use bullet points for lists, not for everything.`,
      messages: await convertToModelMessages(messages),
      maxOutputTokens: 1000,
      temperature: 0.6,
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    console.error('AI chat error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
