import { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  // Rate limit: 10 req/min per IP (M1 fix)
  const limited = rateLimit(req, { limit: 10, window: 60, prefix: 'health' });
  if (limited) return limited;

  return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
