import { Metadata } from 'next';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import DisclaimerOnboarding from './DisclaimerOnboarding';

export const metadata: Metadata = {
  title: 'Legal Disclaimer | PactTailor',
};

export default async function OnboardingDisclaimerPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // If already completed, skip to dashboard
  const svc = createServiceClient();
  const { data: profile } = await svc
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  if (profile?.onboarding_completed) redirect('/dashboard');

  return <DisclaimerOnboarding />;
}
