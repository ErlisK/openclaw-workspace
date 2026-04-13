'use client';
/**
 * components/dashboard/ContractRow.tsx
 * One row in the contracts table. Shows provenance, version, and action buttons.
 * Inline "Edit note" modal for minor re-versioning.
 */

import { useState } from 'react';
import Link from 'next/link';

interface Contract {
  id:               string;
  document_id:      string;
  product_name:     string | null;
  creator_name:     string | null;
  template_slug:    string | null;
  template_version: string | null;
  jurisdiction_code: string | null;
  platform_code:    string | null;
  version_number:   number | null;
  parent_document_id: string | null;
  minor_edit_note:  string | null;
  edited_at:        string | null;
  verification_hash: string | null;
  is_active:        boolean | null;
  created_at:       string;
  updated_at:       string;
  ai_plain_text:    string | null;
}

interface Props {
  contract: Contract;
  appUrl:   string;
}

export default function ContractRow({ contract, appUrl }: Props) {
  const [editOpen, setEditOpen]   = useState(false);
  const [editNote, setEditNote]   = useState('');
  const [saving,   setSaving]     = useState(false);
  const [saved,    setSaved]      = useState(false);
  const [error,    setError]      = useState('');

  const shortId  = contract.document_id?.slice(-8) ?? contract.id.slice(-8);
  const verifyUrl = contract.verification_hash
    ? `${appUrl}/verify/${contract.verification_hash.slice(0, 16)}`
    : null;
  const version  = contract.version_number ?? 1;

  async function handleMinorEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/contracts/${contract.document_id}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: editNote }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Failed');
      setSaved(true);
      setEditOpen(false);
      // Refresh to show updated version
      setTimeout(() => window.location.reload(), 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        {/* Contract name */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {contract.product_name ?? 'Untitled contract'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{shortId}</p>
            </div>
            {!contract.is_active && (
              <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">archived</span>
            )}
            {contract.parent_document_id && (
              <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded" title={`Revised from ${contract.parent_document_id}`}>
                revised
              </span>
            )}
          </div>
        </td>

        {/* Template */}
        <td className="px-4 py-3 hidden sm:table-cell">
          <div className="text-xs text-gray-600">{contract.template_slug ?? '—'}</div>
          <div className="text-xs text-gray-400">{contract.jurisdiction_code ?? ''} {contract.platform_code ? `· ${contract.platform_code}` : ''}</div>
        </td>

        {/* Version */}
        <td className="px-4 py-3 hidden md:table-cell">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
              v{contract.template_version ?? '1.0'}
            </span>
            <span className="text-xs text-gray-400">rev {version}</span>
          </div>
          {contract.minor_edit_note && (
            <p className="text-xs text-gray-400 mt-0.5 italic truncate max-w-[160px]" title={contract.minor_edit_note}>
              {contract.minor_edit_note}
            </p>
          )}
        </td>

        {/* Created */}
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className="text-xs text-gray-500">
            {new Date(contract.created_at).toLocaleDateString()}
          </span>
          {contract.edited_at && (
            <p className="text-xs text-gray-400">
              edited {new Date(contract.edited_at).toLocaleDateString()}
            </p>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/contracts/${contract.document_id}`}
              className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
            >
              View
            </Link>
            <a
              href={`/api/contracts/${contract.document_id}/download?format=pdf`}
              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
            >
              PDF
            </a>
            {verifyUrl && (
              <a
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 transition-colors"
                title="Verify provenance"
              >
                ✓ Verify
              </a>
            )}
            <button
              onClick={() => { setEditOpen(true); setEditNote(''); setSaved(false); setError(''); }}
              className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded hover:bg-amber-100 transition-colors"
              title="Save a minor revision note"
            >
              ✏️ Note
            </button>
          </div>
        </td>
      </tr>

      {/* Minor edit modal */}
      {editOpen && (
        <tr>
          <td colSpan={5} className="p-0">
            <div className="bg-amber-50 border-t border-b border-amber-100 px-4 py-4">
              <form onSubmit={handleMinorEdit} className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-amber-800 mb-1">
                    Minor revision note — re-versions this contract (rev {version} → rev {version + 1})
                  </label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    placeholder="e.g. Clarified attribution clause wording"
                    required
                    maxLength={200}
                    className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  />
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !editNote.trim()}
                    className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save revision'}
                  </button>
                </div>
              </form>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
