'use client';
/**
 * components/AISimplifyPanel.tsx
 * "AI Simplified View" toggle for the contract page.
 * Fetches simplified text on demand, caches it, toggles between views.
 * Includes AI disclaimer and a "disable AI" toggle that persists via cookie.
 */

import { useState, useEffect } from 'react';

interface Props {
  contractId: string;
  initialAiText?: string | null;
  aiDisabled?: boolean;
}

export default function AISimplifyPanel({ contractId, initialAiText, aiDisabled: initialDisabled }: Props) {
  const [showAI, setShowAI]       = useState(false);
  const [aiText, setAiText]       = useState<string | null>(initialAiText ?? null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [aiEnabled, setAiEnabled] = useState(!initialDisabled);

  // Persist ai-disabled preference in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('pacttailor_ai_disabled');
    if (stored === 'true') setAiEnabled(false);
  }, []);

  function toggleAIEnabled() {
    const next = !aiEnabled;
    setAiEnabled(next);
    localStorage.setItem('pacttailor_ai_disabled', next ? 'false' : 'true');
    if (!next) setShowAI(false);
  }

  async function fetchSimplified() {
    if (aiText) { setShowAI(true); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId }),
      });
      const data = await res.json();
      if (data.ok) {
        setAiText(data.aiPlainText);
        setShowAI(true);
      } else {
        setError(data.error ?? 'AI simplification failed. Please try again.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  if (!aiEnabled) {
    return (
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500">
        <span>✨ AI features disabled for this session.</span>
        <button
          type="button"
          onClick={toggleAIEnabled}
          className="text-indigo-600 hover:underline font-medium"
        >
          Re-enable AI
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* AI disclaimer banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-indigo-500 text-lg mt-0.5">✨</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-indigo-900">AI Plain-English Summary</p>
          <p className="text-xs text-indigo-700 mt-0.5">
            An AI model (Claude) rewrites the contract in everyday language so you can quickly
            understand what you&apos;re agreeing to.{' '}
            <strong>Not legal advice.</strong> Always review the full legal text.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {!showAI ? (
            <button
              type="button"
              onClick={fetchSimplified}
              disabled={loading}
              className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Simplifying…
                </>
              ) : '⚡ Show AI version'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAI(false)}
              className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
            >
              Show original
            </button>
          )}
          <button
            type="button"
            onClick={toggleAIEnabled}
            className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
          >
            Disable AI
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* AI-simplified content */}
      {showAI && aiText && (
        <div className="bg-white rounded-xl border border-indigo-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              ✨ AI-simplified
            </span>
            <span className="text-xs text-gray-400">Claude · {new Date().toLocaleDateString()}</span>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
            {aiText}
          </div>
        </div>
      )}
    </div>
  );
}
