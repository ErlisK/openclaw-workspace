'use client';
/**
 * components/ClauseExplainer.tsx
 * "Explain this clause" button + tooltip that streams an AI explanation.
 *
 * Usage:
 *   <ClauseExplainer
 *     clauseTitle="Payment Terms"
 *     legalText="Client agrees to pay Artist a total fee of..."
 *     plainText="You pay the artist the agreed amount..."
 *     jurisdiction="US"
 *     aiEnabled={true}
 *   />
 */

import { useState, useRef } from 'react';

interface Props {
  clauseTitle: string;
  legalText: string;
  plainText?: string;
  jurisdiction?: string;
  aiEnabled: boolean;
}

export default function ClauseExplainer({ clauseTitle, legalText, plainText, jurisdiction, aiEnabled }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  if (!aiEnabled) return null;

  async function fetchExplanation() {
    if (explanation) { setOpen(o => !o); return; }
    setOpen(true);
    setLoading(true);
    setError('');
    setExplanation('');

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clauseTitle, legalText, plainText, jurisdiction }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setExplanation(full);
      }
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setError('Could not load AI explanation. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function close() {
    abortRef.current?.abort();
    setOpen(false);
  }

  return (
    <span className="inline-block ml-1">
      <button
        type="button"
        onClick={fetchExplanation}
        title="Explain this clause with AI"
        className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 hover:bg-indigo-50 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.35A3.001 3.001 0 0112 21a3.001 3.001 0 01-2.121-.878l-.347-.349a5 5 0 010-7.07z"/>
        </svg>
        AI Explain
      </button>

      {open && (
        <div className="mt-2 relative bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-gray-700 leading-relaxed max-w-prose">
          {/* Close button */}
          <button
            type="button"
            onClick={close}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          {/* AI badge */}
          <div className="flex items-center gap-1.5 mb-2">
            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-medium px-1.5 py-0.5 rounded">
              ✨ AI
            </span>
            <span className="text-gray-500 font-medium">Explanation</span>
          </div>

          {loading && !explanation && (
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Generating explanation…
            </div>
          )}

          {error && (
            <p className="text-red-600 text-xs">{error}</p>
          )}

          {explanation && (
            <p className="whitespace-pre-wrap">{explanation}</p>
          )}

          {/* Disclaimer */}
          <p className="mt-2 pt-2 border-t border-indigo-200 text-gray-400 text-xs">
            ⚠️ AI-generated — not legal advice. Consult a licensed attorney.
          </p>
        </div>
      )}
    </span>
  );
}
