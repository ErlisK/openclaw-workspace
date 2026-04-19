import { NextRequest, NextResponse } from 'next/server';

function getAllowedOrigins(): string[] {
  const env = process.env.ALLOWED_ORIGINS ?? '';
  const origins = env.split(',').map(o => o.trim()).filter(Boolean);
  return origins.length ? origins : ['https://teachrepo.com'];
}

function originMatches(origin: string, pattern: string): boolean {
  if (pattern === origin) return true;
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    return regex.test(origin);
  }
  return false;
}

export function withCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get('origin');
  const allowed = getAllowedOrigins();
  if (origin && allowed.some(a => originMatches(origin, a))) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Stripe-Signature');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Vary', 'Origin');
  }
  return res;
}

export function corsOptionsResponse(req: NextRequest): NextResponse {
  const res = new NextResponse(null, { status: 204 });
  return withCors(req, res);
}
