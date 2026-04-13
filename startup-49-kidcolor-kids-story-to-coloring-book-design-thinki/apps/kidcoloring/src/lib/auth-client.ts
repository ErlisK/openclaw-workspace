import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function getUser() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  return user
}

export async function signOut() {
  const sb = createClient()
  await sb.auth.signOut()
}

export async function sendMagicLink(email: string, redirectTo: string) {
  const sb = createClient()
  return sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  })
}
