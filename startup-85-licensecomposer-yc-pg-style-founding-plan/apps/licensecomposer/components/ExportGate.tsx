'use client';
/**
 * components/ExportGate.tsx
 * Client component: checks /api/entitlements on mount.
 * - If user is at cap (freeExportsRemaining === 0): shows hard block + upgrade CTA
 * - If user is at cap - 1 (last export): shows a soft warning banner
 * - If unlimited: renders children with no overhead
 * - Before check resolves: renders children (optimistic / no flash)
 *
 * Usage (wrap the final "Generate" button in wizard):
 *   <ExportGate>
 *     <button onClick={handleGenerate}>Generate Contract</button>
 *   </ExportGate>
 */
import React, { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';

interface EntitlementsResponse {
  ok:                   boolean;
  plan:                 'free' | 'unlimited';
  anonymous:            boolean;
  unlimitedExports:     boolean;
  freeExportsRemaining: number | null;
}

interface ExportGateProps {
  children: ReactNode;
  /** Called before generating; if gating blocks, this never fires */
  onBlock?: () => void;
}

export default function ExportGate({ children, onBlock }: ExportGateProps) {
  const [ents, setEnts]       = useState<EntitlementsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/entitlements')
      .then(r => r.json())
      .then((d: EntitlementsResponse) => setEnts(d))
      .catch(() => setEnts(null))
      .finally(() => setLoading(false));
  }, []);

  // While loading, show children optimistically
  if (loading || !ents) return <>{children}</>;

  // Unlimited plan → pass through
  if (ents.unlimitedExports || ents.plan === 'unlimited') return <>{children}</>;

  const remaining = ents.freeExportsRemaining ?? 2;

  // Hard block: cap reached
  if (remaining <= 0) {
    onBlock?.();
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
        <div className="text-2xl">🚫</div>
        <p className="font-semibold text-red-800 text-base">
          You&apos;ve used all {ents.anonymous ? '2' : '2'} free exports this month
        </p>
        <p className="text-sm text-red-700">
          Upgrade to <strong>PactTailor Unlimited</strong> for unlimited contract exports, hosted license pages, version history, and more — just <strong>$9/year</strong>.
        </p>
        <div className="flex justify-center gap-3 pt-1">
          <Link
            href="/pricing"
            className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Upgrade for $9/year →
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 border border-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Dashboard
          </Link>
        </div>
        {ents.anonymous && (
          <div className="mt-2 p-3 bg-white rounded-lg border border-indigo-100">
            <p className="text-sm text-indigo-900 font-medium">Free account — no credit card needed</p>
            <p className="text-xs text-gray-600 mt-1">Sign up for a free account to get 2 exports/month, or upgrade for unlimited.</p>
            <div className="flex gap-2 mt-2">
              <Link href="/signup?next=/wizard" className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                Sign up free →
              </Link>
              <Link href="/login?next=/wizard" className="text-xs text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Soft warning: 1 export remaining
  if (remaining === 1) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">
              Last free export this month
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              After this you&apos;ll need{' '}
              <Link href="/pricing" className="underline font-medium hover:text-amber-900">
                PactTailor Unlimited ($9/yr)
              </Link>{' '}
              for more exports.
            </p>
          </div>
          <Link
            href="/pricing"
            className="flex-shrink-0 text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            Upgrade
          </Link>
        </div>
        {children}
      </div>
    );
  }

  // Normal: show remaining pill + children
  return (
    <div className="space-y-2">
      {!ents.anonymous && (
        <p className="text-xs text-gray-400 text-right">
          {remaining} of 2 free exports remaining this month
        </p>
      )}
      {children}
    </div>
  );
}
