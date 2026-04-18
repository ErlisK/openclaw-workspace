'use client';

import { useState, useTransition } from 'react';

interface PublishToggleProps {
  courseId: string;
  initialPublished: boolean;
  initialPublishedAt?: string | null;
}

export function PublishToggle({ courseId, initialPublished, initialPublishedAt }: PublishToggleProps) {
  const [published, setPublished] = useState(initialPublished);
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt ?? null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const next = !published;
      try {
        const res = await fetch(`/api/courses/${courseId}/publish`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ published: next }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Failed to update');
          return;
        }
        setPublished(data.published);
        setPublishedAt(data.published_at);
      } catch {
        setError('Network error — please try again.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        {/* Toggle switch */}
        <button
          onClick={toggle}
          disabled={isPending}
          aria-pressed={published}
          aria-label={published ? 'Unpublish course' : 'Publish course'}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 ${
            published ? 'bg-violet-600' : 'bg-gray-200'
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              published ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>

        {/* Status label */}
        <span className={`text-sm font-semibold ${published ? 'text-green-700' : 'text-gray-500'}`}>
          {isPending ? (
            <span className="flex items-center gap-1.5">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {published ? 'Unpublishing…' : 'Publishing…'}
            </span>
          ) : published ? (
            '✅ Live on marketplace'
          ) : (
            'Draft — not visible publicly'
          )}
        </span>
      </div>

      {/* Published date */}
      {published && publishedAt && (
        <p className="ml-14 text-xs text-gray-400">
          Published {new Date(publishedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="ml-14 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
