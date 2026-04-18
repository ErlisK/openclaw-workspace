/**
 * VersionBadge — displays a course version label with commit SHA and optional
 * link to the GitHub commit.
 *
 * Examples:
 *   v1.1.0 · main @ abc1234f ↗
 *   v2.0.0 · tag: v2.0.0 @ def4567b ↗
 *   sha:abc1234f · main @ abc1234f ↗
 */

interface VersionBadgeProps {
  label: string;
  commitSha: string;
  branch?: string | null;
  tag?: string | null;
  repoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VersionBadge({
  label,
  commitSha,
  branch,
  tag,
  repoUrl,
  size = 'md',
  className = '',
}: VersionBadgeProps) {
  const shortSha = commitSha.slice(0, 7);
  const refName = tag ? `tag: ${tag}` : branch ? branch : null;
  const commitUrl = repoUrl ? `${repoUrl}/commit/${commitSha}` : undefined;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size];

  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 font-mono ${sizeClasses} ${className}`}>
      {/* Version label */}
      <span className="font-semibold text-gray-900 dark:text-white">{label}</span>

      {refName && (
        <>
          <span className="text-gray-400" aria-hidden="true">·</span>
          <span className="text-gray-600 dark:text-gray-400">{refName}</span>
        </>
      )}

      <span className="text-gray-400" aria-hidden="true">@</span>

      {/* Commit SHA — link to GitHub if URL available */}
      {commitUrl ? (
        <a
          href={commitUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-600 hover:underline dark:text-violet-400"
          title={`View commit ${commitSha} on GitHub`}
        >
          {shortSha} ↗
        </a>
      ) : (
        <span className="text-gray-600 dark:text-gray-400">{shortSha}</span>
      )}
    </div>
  );
}

/**
 * VersionPill — compact inline version badge for course cards and lesson headers.
 * Shows just the version label with a subtle background.
 */
export function VersionPill({
  label,
  isCurrent = false,
  className = '',
}: {
  label: string;
  isCurrent?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-medium ${
        isCurrent
          ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      } ${className}`}
      title={isCurrent ? 'Current published version' : 'Version'}
    >
      {label}
    </span>
  );
}
