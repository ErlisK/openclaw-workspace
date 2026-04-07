import { NextRequest, NextResponse } from 'next/server';
import { assignVariant, generateSessionId } from '@/lib/ab';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Only run A/B assignment on the home page
  if (request.nextUrl.pathname !== '/') {
    return response;
  }

  // Check for existing AB session cookie
  let sessionId = request.cookies.get('ab_session')?.value;
  let isNew = false;

  if (!sessionId) {
    sessionId = generateSessionId();
    isNew = true;
  }

  const variant = assignVariant(sessionId);

  // Set cookies on the response
  if (isNew) {
    response.cookies.set('ab_session', sessionId, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false, // readable by client for analytics
      sameSite: 'lax',
      path: '/',
    });
  }

  response.cookies.set('ab_variant', variant, {
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
  });

  // Pass variant as header for server components
  response.headers.set('x-ab-variant', variant);
  response.headers.set('x-ab-session', sessionId);

  return response;
}

export const config = {
  matcher: ['/', '/api/ab/:path*'],
};
