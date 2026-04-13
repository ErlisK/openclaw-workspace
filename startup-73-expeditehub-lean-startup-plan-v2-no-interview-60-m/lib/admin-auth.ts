import { NextRequest } from 'next/server'

export function isAdminAuthed(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret')
    ?? req.cookies.get('admin_secret')?.value
    ?? req.nextUrl.searchParams.get('s')
  return !!secret && secret === process.env.ADMIN_SECRET
}
