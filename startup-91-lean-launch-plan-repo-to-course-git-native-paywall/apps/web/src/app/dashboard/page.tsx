import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: courses } = await supabase
    .from('courses')
    .select('id, slug, title, published, price_cents, currency')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Courses</h1>
          <p className="mt-1 text-sm text-gray-500">{user.email}</p>
        </div>
        <a href="/dashboard/new" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
          + New course
        </a>
      </div>

      {(!courses || courses.length === 0) ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-4xl mb-4">📚</p>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No courses yet</h2>
          <p className="text-sm text-gray-500 mb-6">Import a GitHub repo to publish your first course.</p>
          <a href="/dashboard/new" className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
            Import a repo →
          </a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <a key={c.id} href={`/dashboard/courses/${c.id}`}
              className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{c.title}</h3>
                <span className={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${c.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {c.published ? 'Live' : 'Draft'}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {c.price_cents === 0 ? 'Free' : `$${(c.price_cents / 100).toFixed(0)} ${c.currency.toUpperCase()}`}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
