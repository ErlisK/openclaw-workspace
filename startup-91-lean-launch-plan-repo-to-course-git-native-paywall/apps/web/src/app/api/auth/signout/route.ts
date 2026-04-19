import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(_req: NextRequest) {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ message: 'Signed out successfully.' }, { status: 200 });
}
