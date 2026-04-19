'use client';

import { useState, useTransition } from 'react';

interface PromoteButtonProps {
  courseId: string;
  versionId: string;
  versionLabel: string;
  onPromoted?: () => void;
}

/**
 * Client component — calls POST /api/courses/[courseId]/versions to promote
 * a version to current, then reloads the page to reflect the change.
 */
export function PromoteButton({ courseId, versionId, versionLabel, onPromoted }: PromoteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handlePromote = () => {
    if (!confirm(`Set "${versionLabel}" as the current live version? Students will immediately see this version.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionId }),
        });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          setError(d.error || 'Promote failed');
          return;
        }
        setDone(true);
        onPromoted?.();
        // Reload to reflect new current version
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
      }
    });
  };

  if (done) {
    return <span className="text-xs text-green-600 font-medium">✓ Set as current</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handlePromote}
        disabled={isPending}
        className="text-xs font-medium text-violet-600 hover:text-violet-700 hover:underline dark:text-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Promoting…' : 'Set as current'}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
