import { NextResponse } from 'next/server';

/**
 * GET /api/auth/callback
 *
 * Placeholder for OAuth provider callbacks (Google, GitHub, etc.).
 * Browser-based auth uses /auth/callback (Server Action route).
 * This REST endpoint is reserved for future OAuth flows.
 *
 * @returns 501 Not Implemented
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'Not implemented',
      message: 'OAuth callback is not yet available via this REST endpoint. Browser sign-in uses /auth/callback.',
    },
    { status: 501 },
  );
}
