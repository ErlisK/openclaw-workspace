// SandboxEmbed — renders an iframe for enrolled students, paywall CTA otherwise.
// Security: the url prop is populated server-side only for enrolled users.
// For paid lessons, unenrolled browsers never receive the sandbox URL.

interface SandboxEmbedProps {
  /** Sandbox URL — empty string if unenrolled on a paid lesson */
  url: string;
  /** Whether the current user is enrolled in this course */
  enrolled: boolean;
  /** Provider name for display purposes */
  provider?: 'stackblitz' | 'codesandbox' | 'codepen';
  /** The slug of the course — used in the enroll CTA link */
  courseSlug?: string;
  title?: string;
  height?: number;
}

export function SandboxEmbed({
  url,
  enrolled,
  provider = 'stackblitz',
  courseSlug,
  title = 'Interactive Code Sandbox',
  height = 500,
}: SandboxEmbedProps) {
  // Server-side: url is empty when unenrolled on a paid lesson
  if (!url || !enrolled) {
    return (
      <div
        className="relative my-8 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
        style={{ height }}
        aria-label="Gated sandbox — enroll to access"
      >
        {/* Blurred code background */}
        <div className="absolute inset-0 overflow-hidden">
          <pre
            className="h-full overflow-hidden p-6 text-xs text-gray-400 dark:text-gray-600 select-none blur-sm"
            aria-hidden="true"
          >
            {BLURRED_CODE_PLACEHOLDER}
          </pre>
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-gray-900/70">
          <div className="max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 text-4xl" aria-hidden="true">
              {providerIcon(provider)}
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Live {providerName(provider)} Sandbox
            </h3>
            <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">
              Enroll to access the live, editable code sandbox for this lesson.
            </p>
            {courseSlug ? (
              <a
                href={`/courses/${courseSlug}#enroll`}
                className="inline-block rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
              >
                Enroll to unlock →
              </a>
            ) : (
              <p className="text-sm text-violet-600 dark:text-violet-400">
                Enroll in this course to access
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Enrolled: render the actual iframe
  return (
    <div
      className="my-8 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm dark:border-gray-700"
      style={{ height }}
    >
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">{providerIcon(provider)}</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
        </div>
        <a
          href={url.replace('?embed=1', '')}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700 dark:text-gray-400"
        >
          Open in new tab ↗
        </a>
      </div>
      <iframe
        src={url}
        title={title}
        className="h-[calc(100%-41px)] w-full border-0"
        allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        loading="lazy"
      />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function providerIcon(provider: string) {
  switch (provider) {
    case 'stackblitz': return '⚡';
    case 'codesandbox': return '📦';
    case 'codepen': return '🖊️';
    default: return '💻';
  }
}

function providerName(provider: string) {
  switch (provider) {
    case 'stackblitz': return 'StackBlitz';
    case 'codesandbox': return 'CodeSandbox';
    case 'codepen': return 'CodePen';
    default: return 'Code';
  }
}

const BLURRED_CODE_PLACEHOLDER = `
const pipeline = async (branch: string) => {
  const sha = await resolveHead(branch);
  const tree = await fetchTree(sha);
  const lessons = await Promise.all(
    tree
      .filter(isLesson)
      .map(fetchAndParse)
  );
  return { sha, lessons };
};

export async function POST(req: Request) {
  const { repo_url, branch } = await req.json();
  const payload = await pipeline(branch);
  await upsertToSupabase(payload);
  return Response.json({ ok: true });
}
`.trim();
