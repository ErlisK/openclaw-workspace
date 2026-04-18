import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { ProfileForm } from '@/components/dashboard/ProfileForm';

export default async function SettingsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/dashboard/settings');

  const serviceSupa = createServiceClient();
  const { data: creator } = await serviceSupa
    .from('creators')
    .select('*')
    .eq('id', user.id)
    .single();

  const provider = user.app_metadata?.provider ?? 'email';

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 lg:px-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Profile settings</h1>

      {/* Auth provider badge */}
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-xl">
          {provider === 'google' ? '🔵' : '📧'}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{user.email}</p>
          <p className="text-xs text-gray-500 capitalize">Signed in via {provider}</p>
        </div>
        <div className="ml-auto">
          <form action="/auth/logout" method="POST">
            <button type="submit" className="text-sm text-gray-500 hover:text-red-600">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <ProfileForm creator={creator} />
    </div>
  );
}
