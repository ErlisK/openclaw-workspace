/**
 * Agent API Key authentication helper.
 * 
 * AI agents pass:  Authorization: Bearer aqk_<key>
 * 
 * We hash the raw key and look it up in agent_api_keys.
 * Returns the user_id if valid, null otherwise.
 */
import { createHash, randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const rawBytes = randomBytes(32).toString('hex')
  const raw = `aqk_${rawBytes}`
  const prefix = raw.slice(0, 12) // "aqk_" + 8 hex chars
  const hash = createHash('sha256').update(raw).digest('hex')
  return { raw, prefix, hash }
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export async function authenticateApiKey(
  authHeader: string | null
): Promise<{ userId: string } | null> {
  if (!authHeader?.startsWith('Bearer aqk_')) return null
  const raw = authHeader.slice(7) // strip "Bearer "
  const hash = hashApiKey(raw)

  // Use service-role client so we can read api keys without user context
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agent_api_keys')
    .select('id, user_id, revoked_at')
    .eq('key_hash', hash)
    .single()

  if (error || !data || data.revoked_at) return null

  // Update last_used_at (fire and forget)
  supabase
    .from('agent_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return { userId: data.user_id }
}
