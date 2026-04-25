import { createHmac } from 'crypto'

export function hashCustomerKey(email: string | null, userId: string): string | null {
  if (!email) return null
  return createHmac('sha256', userId)
    .update(email.toLowerCase().trim())
    .digest('hex')
}
