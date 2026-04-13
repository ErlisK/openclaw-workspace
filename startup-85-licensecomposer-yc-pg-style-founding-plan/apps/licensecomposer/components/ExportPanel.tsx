'use client';
/**
 * components/ExportPanel.tsx
 * Download panel on the contract page.
 * Shows all export formats; clicking "Export All" triggers POST /api/exports
 * which renders + stores all formats to Supabase Storage and returns signed URLs.
 */

import { useState } from 'react';
import { analytics } from '@/lib/analytics';

interface ExportResult {
  format: string;
  signedUrl: string | null;
  sizeBytes: number;
}

interface Props {
  contractId: string;
}

const FORMAT_META: Record<string, { label: string; icon: string; desc: string }> = {
  pdf:    { label: 'PDF',      icon: '📄', desc: 'Ready-to-share document with branding' },
  html:   { label: 'HTML',     icon: '🌐', desc: 'Styled web page with embedded provenance' },
  md:     { label: 'Markdown', icon: '📝', desc: 'Text with JSON-LD metadata block' },
  txt:    { label: 'Plain text', icon: '📃', desc: 'Clean text with provenance comment' },
  jsonld: { label: 'JSON-LD',  icon: '🔗', desc: 'Machine-readable provenance metadata' },
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ExportPanel({ contractId }: Props) {
  const [exports, setExports]   = useState<ExportResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleExportAll() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, formats: ['pdf', 'html', 'md', 'txt'] }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Export failed');
      setExports(data.exports);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  }

  const hasExports = exports.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">⬇️ Export Contract</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Render to PDF, HTML, Markdown, or plain text. Files stored securely with signed URLs.
          </p>
        </div>
        {!hasExports && (
          <button
            type="button"
            onClick={handleExportAll}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Rendering…
              </>
            ) : '⚡ Export All Formats'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Quick direct download links (no storage) */}
      {!hasExports && (
        <div className="flex flex-wrap gap-2">
          {['pdf', 'html', 'md', 'txt', 'jsonld'].map(fmt => {
            const meta = FORMAT_META[fmt];
            return (
              <a
                key={fmt}
                href={`/api/contracts/${contractId}/download?format=${fmt}`}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-colors"
                download
                onClick={() => {
                  if (fmt === 'pdf') analytics.exportPdf(contractId);
                  else if (fmt === 'md') analytics.exportMd(contractId);
                  else if (fmt === 'html') analytics.exportHtml(contractId);
                }}
              >
                <span>{meta.icon}</span> {meta.label}
              </a>
            );
          })}
        </div>
      )}

      {/* Stored export results */}
      {hasExports && (
        <div className="space-y-2">
          <p className="text-xs text-green-600 font-medium mb-3">
            ✅ Exports stored to Supabase Storage — signed URLs valid 24 hours
          </p>
          {exports.map(exp => {
            const meta = FORMAT_META[exp.format] ?? { label: exp.format, icon: '📁', desc: '' };
            return (
              <div key={exp.format} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{meta.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                    <p className="text-xs text-gray-500">{formatBytes(exp.sizeBytes)} · {meta.desc}</p>
                  </div>
                </div>
                {exp.signedUrl ? (
                  <a
                    href={exp.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    ⬇️ Download
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">Storage unavailable</span>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setExports([])}
            className="text-xs text-gray-400 hover:text-gray-600 mt-2"
          >
            Re-export
          </button>
        </div>
      )}
    </div>
  );
}
