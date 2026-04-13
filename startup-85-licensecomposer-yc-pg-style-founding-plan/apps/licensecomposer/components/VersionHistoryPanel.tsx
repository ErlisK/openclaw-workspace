'use client';
/**
 * components/VersionHistoryPanel.tsx
 * Fetches and displays version history for a contract.
 * Collapsible; loads on demand.
 */

import { useState } from 'react';

interface HistoryEntry {
  document_id:        string;
  product_name:       string | null;
  version_number:     number | null;
  template_version:   string | null;
  minor_edit_note:    string | null;
  edited_at:          string | null;
  verification_hash:  string | null;
  created_at:         string;
  is_active:          boolean | null;
  parent_document_id: string | null;
}

interface Props {
  contractId: string;
}

export default function VersionHistoryPanel({ contractId }: Props) {
  const [open,    setOpen]    = useState(false);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function load() {
    if (history) { setOpen(o => !o); return; }
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/history`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Failed');
      setHistory(data.history);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <button
        onClick={load}
        className="flex items-center justify-between w-full text-left"
      >
        <div>
          <h2 className="text-sm font-semibold text-gray-900">🔄 Version History</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Minor revisions and same-template contract history
          </p>
        </div>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-4">
          {loading && (
            <p className="text-xs text-gray-400 animate-pulse">Loading history…</p>
          )}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
          {history && history.length === 0 && (
            <p className="text-xs text-gray-400 italic">No version history found for this template.</p>
          )}
          {history && history.length > 0 && (
            <div className="space-y-2">
              {history.map((entry, i) => {
                const isCurrent = entry.document_id === contractId;
                return (
                  <div key={entry.document_id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      isCurrent
                        ? 'border-indigo-200 bg-indigo-50'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      isCurrent ? 'bg-indigo-600' : 'bg-gray-300'
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-mono font-medium ${
                          isCurrent ? 'text-indigo-700' : 'text-gray-600'
                        }`}>
                          {entry.document_id?.slice(-8)}
                        </span>
                        <span className="text-xs text-gray-400">
                          rev {entry.version_number ?? 1}
                        </span>
                        <span className="text-xs bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                          v{entry.template_version ?? '1.0'}
                        </span>
                        {isCurrent && (
                          <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded">current</span>
                        )}
                        {entry.parent_document_id && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">revised</span>
                        )}
                      </div>
                      {entry.minor_edit_note && (
                        <p className="text-xs text-gray-600 mt-0.5 italic">
                          &ldquo;{entry.minor_edit_note}&rdquo;
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        Created {new Date(entry.created_at).toLocaleDateString()}
                        {entry.edited_at && ` · edited ${new Date(entry.edited_at).toLocaleDateString()}`}
                      </p>
                    </div>

                    {!isCurrent && (
                      <a
                        href={`/contracts/${entry.document_id}`}
                        className="text-xs text-indigo-600 hover:underline flex-shrink-0"
                      >
                        View →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
