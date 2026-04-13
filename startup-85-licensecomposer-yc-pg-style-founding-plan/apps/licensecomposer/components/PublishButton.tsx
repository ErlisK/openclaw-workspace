'use client';
/**
 * components/PublishButton.tsx
 * Button that opens PublishModal and shows results.
 */

import { useState } from 'react';
import PublishModal from './PublishModal';
import BadgeSnippets from './BadgeSnippets';

interface Props {
  contractDocumentId: string;
  contractTitle:      string;
}

export default function PublishButton({ contractDocumentId, contractTitle }: Props) {
  const [open,      setOpen]      = useState(false);
  const [published, setPublished] = useState<{ url: string; badgeCode: string } | null>(null);
  const [copied,    setCopied]    = useState<'url' | 'badge' | null>(null);

  function handlePublished(url: string, badgeCode: string) {
    setPublished({ url, badgeCode });
    setOpen(false);
  }

  async function copy(text: string, kind: 'url' | 'badge') {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">🚀 Publish License Page</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Get a public URL + embeddable badge for your storefront
            </p>
          </div>
          {!published && (
            <button
              onClick={() => setOpen(true)}
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              🚀 Publish
            </button>
          )}
        </div>

        {published && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
              <span className="text-green-700 font-medium text-sm flex-1 break-all">{published.url}</span>
              <button
                onClick={() => copy(published.url, 'url')}
                className="flex-shrink-0 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
              >
                {copied === 'url' ? '✓ Copied' : 'Copy URL'}
              </button>
              <a
                href={published.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
              >
                Open →
              </a>
            </div>

            {/* All embed format snippets */}
            <div className="border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">🏷 Embed on your storefront:</p>
              <BadgeSnippets slug={published.url.split('/l/').pop() ?? ''} />
            </div>
          </div>
        )}
      </div>

      {open && (
        <PublishModal
          contractDocumentId={contractDocumentId}
          contractTitle={contractTitle}
          onClose={() => setOpen(false)}
          onPublished={handlePublished}
        />
      )}
    </>
  );
}
