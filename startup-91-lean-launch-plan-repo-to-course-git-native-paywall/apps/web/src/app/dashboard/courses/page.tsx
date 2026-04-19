import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export default async function DashboardCoursesPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/dashboard/courses');

  const serviceSupa = createServiceClient();
  const { data: courses } = await serviceSupa
    .from('courses')
    .select('id, slug, title, published, price_cents, currency, version, updated_at')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <a
          href="/dashboard/new"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          + New Course
        </a>
      </div>

      {!courses || courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500 mb-4">No courses yet.</p>
          <a
            href="/dashboard/new"
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Create your first course
          </a>
        </div>
      ) : (
        <ul className="space-y-4">
          {courses.map((course) => (
            <li key={course.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <div>
                <a
                  href={`/dashboard/courses/${course.id}`}
                  className="font-semibold text-gray-900 hover:text-violet-600"
                >
                  {course.title}
                </a>
                <p className="mt-0.5 text-xs text-gray-500">
                  /{course.slug} · v{course.version ?? 1} ·{' '}
                  {course.price_cents === 0 ? 'Free' : `$${(course.price_cents / 100).toFixed(0)} ${course.currency?.toUpperCase() ?? 'USD'}`}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  course.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {course.published ? 'Published' : 'Draft'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
