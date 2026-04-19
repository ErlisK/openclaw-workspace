import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { VersionBadge } from '@/components/dashboard/VersionBadge';
import { PromoteButton } from '@/components/dashboard/PromoteButton';

export const metadata: Metadata = {
  title: 'Version History — Creator Dashboard',
  robots: { index: false },
};

interface VersionHistoryPageProps {
  params: { courseId: string };
}

interface CourseVersion {
  id: string;
  commit_sha: string;
  branch: string | null;
  tag: string | null;
  version_label: string;
  lesson_count: number;
  quiz_count: number;
  is_current: boolean;
  published_at: string | null;
  imported_at: string;
}

export default async function VersionHistoryPage({ params }: VersionHistoryPageProps) {
  const supabase = createServerClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="p-8 text-center text-gray-600">
        <p>Please <a href="/auth/login" className="text-violet-600 underline">sign in</a> to view your courses.</p>
      </div>
    );
  }

  const serviceSupa = createServiceClient();

  // Fetch course — must belong to the authenticated creator
  const { data: course } = await serviceSupa
    .from('courses')
    .select('id, slug, title, repo_url, git_branch, version')
    .eq('id', params.courseId)
    .eq('creator_id', user.id)
    .single();

  if (!course) notFound();

  // Fetch version history
  const { data: versions } = await serviceSupa
    .from('course_versions')
    .select('id, commit_sha, branch, tag, version_label, lesson_count, quiz_count, is_current, published_at, imported_at')
    .eq('course_id', params.courseId)
    .order('imported_at', { ascending: false });

  const versionList: CourseVersion[] = versions ?? [];
  const currentVersion = versionList.find((v) => v.is_current);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          <a href="/dashboard" className="hover:text-violet-600">Dashboard</a>
          <span className="mx-2">›</span>
          <a href={`/dashboard/courses/${params.courseId}`} className="hover:text-violet-600">
            {course.title}
          </a>
          <span className="mx-2">›</span>
          <span>Version History</span>
        </nav>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Version History
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {course.title}
            </p>
          </div>

          {/* Re-import button */}
          <form method="POST" action="/api/import">
            <input type="hidden" name="repo_url" value={course.repo_url ?? ''} />
            <button
              type="submit"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              ↑ Re-import latest
            </button>
          </form>
        </div>

        {/* Repo info */}
        {course.repo_url && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Repo:</span>
            <a
              href={course.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-violet-600 underline-offset-2 hover:underline"
            >
              {course.repo_url.replace('https://github.com/', '')}
            </a>
            <span>·</span>
            <span>Default branch: <code className="font-mono">{course.git_branch ?? 'main'}</code></span>
          </div>
        )}
      </div>

      {/* Current version callout */}
      {currentVersion && (
        <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/30">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            ★ Current version — live to students
          </p>
          <VersionBadge
            label={currentVersion.version_label}
            commitSha={currentVersion.commit_sha}
            branch={currentVersion.branch}
            tag={currentVersion.tag}
            repoUrl={course.repo_url ?? undefined}
            size="lg"
          />
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {currentVersion.lesson_count} lessons · {currentVersion.quiz_count} quizzes
            {currentVersion.published_at && (
              <> · Published {formatRelativeDate(currentVersion.published_at)}</>
            )}
          </div>
        </div>
      )}

      {/* Version history table */}
      {versionList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No versions yet. Import your course to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Version</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Ref</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Content</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Imported</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {versionList.map((v) => (
                <VersionRow
                  key={v.id}
                  version={v}
                  courseId={params.courseId}
                  repoUrl={course.repo_url ?? undefined}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VersionRow({
  version,
  repoUrl,
  courseId,
}: {
  version: CourseVersion;
  courseId: string;
  repoUrl?: string;
}) {
  const refLabel = version.tag
    ? `tag: ${version.tag}`
    : version.branch
    ? `branch: ${version.branch}`
    : 'unknown';

  const statusLabel = version.is_current
    ? { text: '★ Current', cls: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' }
    : version.published_at
    ? { text: 'Superseded', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' }
    : { text: 'Pending', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' };

  const commitUrl = repoUrl
    ? `${repoUrl}/commit/${version.commit_sha}`
    : undefined;

  return (
    <tr className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/50">
      {/* Version label */}
      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
        {version.version_label}
      </td>

      {/* Ref + SHA */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{refLabel}</span>
          {commitUrl ? (
            <a
              href={commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-violet-600 hover:underline"
            >
              {version.commit_sha.slice(0, 7)} ↗
            </a>
          ) : (
            <span className="font-mono text-xs text-gray-400">
              {version.commit_sha.slice(0, 7)}
            </span>
          )}
        </div>
      </td>

      {/* Content counts */}
      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
        {version.lesson_count}L · {version.quiz_count}Q
      </td>

      {/* Import date */}
      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
        {formatRelativeDate(version.imported_at)}
      </td>

      {/* Status badge */}
      <td className="px-4 py-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLabel.cls}`}>
          {statusLabel.text}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {!version.is_current && (
          <PromoteButton
            courseId={courseId}
            versionId={version.id}
            versionLabel={version.version_label}
          />
        )}
      </td>
    </tr>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
