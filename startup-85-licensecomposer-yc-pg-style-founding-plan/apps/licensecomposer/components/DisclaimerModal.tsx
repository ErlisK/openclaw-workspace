'use client';
/**
 * components/DisclaimerModal.tsx
 * Modal with explicit checkbox that blocks Export until disclaimer is accepted.
 * Calls POST /api/contracts/[contractId]/accept-disclaimer on accept.
 */
import { useState } from 'react';

interface DisclaimerModalProps {
  contractId: string;
  onAccepted: () => void;
  onClose: () => void;
}

const DISCLAIMER_TEXT = `IMPORTANT LEGAL DISCLAIMER — PLEASE READ CAREFULLY

These templates are provided for informational purposes only and do not constitute legal advice. LicenseComposer / PactTailor is not a law firm and is not providing legal services. Use of these templates does not create an attorney-client relationship.

The templates have been reviewed by attorneys for general accuracy but may not be appropriate for your specific situation, jurisdiction, or needs. Laws vary by jurisdiction and change over time.

By exporting this contract you acknowledge:

1. You have read and understood this disclaimer.
2. You are responsible for determining whether this contract is suitable for your specific situation.
3. For important legal matters, you should consult a qualified attorney licensed in your jurisdiction.
4. LicenseComposer provides these templates "as is" without warranty of any kind.
5. LicenseComposer is not liable for any damages arising from the use of these templates.`;

export default function DisclaimerModal({ contractId, onAccepted, onClose }: DisclaimerModalProps) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (!checked) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${contractId}/accept-disclaimer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to record acceptance');
      }
      onAccepted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-gray-900">Legal Disclaimer</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto text-sm text-gray-700 whitespace-pre-line font-mono leading-relaxed">
          {DISCLAIMER_TEXT}
        </div>
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            I have read and understood this disclaimer. I acknowledge that these templates are not legal advice and I use them at my own risk.
          </span>
        </label>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={!checked || loading}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Saving…' : 'I Accept — Continue to Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
