'use server';
/**
 * app/actions/profile.ts
 * Server actions for reading and updating user profile data.
 */

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export interface ProfileData {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website_url: string | null;
  creator_type: string | null;
  preferred_jurisdiction: string | null;
  plan: string;
  created_at: string;
  onboarding_completed: boolean;
}

export async function getProfile(): Promise<ProfileData | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: userRow } = await svc
    .from('users')
    .select('plan, created_at')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    website_url: profile.website_url,
    creator_type: profile.creator_type,
    preferred_jurisdiction: profile.preferred_jurisdiction ?? 'US',
    plan: userRow?.plan ?? 'free',
    created_at: userRow?.created_at ?? user.created_at,
    onboarding_completed: profile.onboarding_completed ?? false,
  };
}

export async function updateProfile(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const updates = {
    display_name: formData.get('display_name') as string || null,
    bio: formData.get('bio') as string || null,
    website_url: formData.get('website_url') as string || null,
    creator_type: formData.get('creator_type') as string || null,
    preferred_jurisdiction: formData.get('preferred_jurisdiction') as string || 'US',
    updated_at: new Date().toISOString(),
  };

  const svc = createServiceClient();
  const { error } = await svc
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/profile');
}
