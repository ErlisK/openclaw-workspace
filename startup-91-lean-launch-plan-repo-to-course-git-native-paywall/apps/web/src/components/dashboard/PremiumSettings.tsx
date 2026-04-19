'use client';

/**
 * PremiumSettings — displays the 3 Creator-plan-gated features on the course settings page.
 *
 * Features gated:
 *   1. Custom domain  (Creator only)
 *   2. Affiliate % control  (Free: max 30%, Creator: max 50%)
 *   3. Marketplace priority indexing  (Creator only)
 *
 * Shows locked badge + upgrade CTA for free users.
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';

interface PremiumSettingsProps {
  courseId: string;
  plan: 'free' | 'creator';
  initialAffiliatePct: number;
  initialMarketplaceOptIn: boolean;
  initialMarketplacePriority: boolean;
  initialCustomDomain: string | null;
}

function PlanLock({ upgradeUrl = '/pricing' }: { upgradeUrl?: string }) {
  return (
    <Link
      href={upgradeUrl}
      data-testid="plan-lock-badge"
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 hover:bg-amber-200 transition-colors"
    >
      🔒 Creator plan
    </Link>
  );
}

export function PremiumSettings({
  courseId,
  plan,
  initialAffiliatePct,
  initialMarketplaceOptIn,
  initialMarketplacePriority,
  initialCustomDomain,
}: PremiumSettingsProps) {
  const isCreator = plan === 'creator';
  const maxAffiliatePct = isCreator ? 50 : 30;

  const [affiliatePct, setAffiliatePct] = useState(initialAffiliatePct);
  const [marketplaceOptIn, setMarketplaceOptIn] = useState(initialMarketplaceOptIn);
  const [marketplacePriority, setMarketplacePriority] = useState(initialMarketplacePriority);
  const [customDomain, setCustomDomain] = useState(initialCustomDomain ?? '');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    setWarnings([]);
    try {
      const res = await fetch(`/api/courses/${courseId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          affiliate_pct: affiliatePct,
          marketplace_opt_in: marketplaceOptIn,
          marketplace_priority: marketplacePriority,
          custom_domain: customDomain || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Save failed');
        if (data.upgradeUrl) {
          setError(`${data.error} → Upgrade at /pricing`);
        }
      } else {
        setSaved(true);
        if (data.warnings?.length) setWarnings(data.warnings);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [courseId, affiliatePct, marketplaceOptIn, marketplacePriority, customDomain]);

  return (
    <div className="space-y-6" data-testid="premium-settings">

      {/* ── 1. Custom Domain ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Custom domain</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Point a subdomain like <code className="rounded bg-gray-100 px-1">learn.yourbrand.com</code> to this course.
            </p>
          </div>
          {!isCreator && <PlanLock />}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder={isCreator ? 'e.g. learn.yourbrand.com' : 'Upgrade to Creator to use custom domains'}
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            disabled={!isCreator}
            data-testid="custom-domain-input"
            className={`w-full rounded-lg border px-3 py-2 text-sm font-mono ${
              isCreator
                ? 'border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500'
                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          />
          {!isCreator && (
            <div className="absolute inset-0 rounded-lg cursor-not-allowed" />
          )}
        </div>
        {isCreator && (
          <p className="mt-2 text-xs text-gray-400">
            Add a <code className="rounded bg-gray-100 px-1">CNAME</code> record pointing to{' '}
            <code className="rounded bg-gray-100 px-1">cname.vercel-dns.com</code>
          </p>
        )}
      </div>

      {/* ── 2. Affiliate % Control ───────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Affiliate commission
              <span className="ml-2 text-violet-600 font-bold text-base" data-testid="affiliate-pct-display">
                {affiliatePct}%
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isCreator
                ? 'Set commission for affiliates who refer buyers (up to 50% on Creator plan)'
                : 'Free plan: up to 30%. Upgrade to Creator for up to 50%.'}
            </p>
          </div>
          {!isCreator && affiliatePct < 30 && (
            <span className="text-xs text-gray-400">max 30% on Free</span>
          )}
          {!isCreator && (
            <Link
              href="/pricing"
              className="text-xs text-violet-600 hover:underline ml-2"
              data-testid="affiliate-upgrade-link"
            >
              Unlock 50% →
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={maxAffiliatePct}
            step={5}
            value={affiliatePct}
            onChange={(e) => setAffiliatePct(Number(e.target.value))}
            data-testid="affiliate-pct-slider"
            className="flex-1 accent-violet-600"
          />
          <span className="text-sm font-mono font-bold text-gray-900 w-12 text-right">
            {affiliatePct}%
          </span>
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-400">
          <span>0%</span>
          {!isCreator && <span className="text-amber-600 font-medium">30% (your max)</span>}
          {isCreator && <span>25%</span>}
          <span className={isCreator ? 'text-violet-600 font-medium' : 'text-gray-300'}>50%</span>
        </div>
      </div>

      {/* ── 3. Marketplace Priority Indexing ────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Marketplace priority listing</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isCreator
                ? 'Show this course higher in marketplace search results.'
                : 'Creator plan courses appear higher in marketplace search. Upgrade to unlock.'}
            </p>
          </div>
          {!isCreator && <PlanLock />}
        </div>

        {/* Marketplace opt-in — available to all */}
        <label className="flex items-center gap-3 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={marketplaceOptIn}
            onChange={(e) => setMarketplaceOptIn(e.target.checked)}
            data-testid="marketplace-opt-in-toggle"
            className="h-4 w-4 rounded accent-violet-600"
          />
          <span className="text-sm text-gray-700">List on TeachRepo marketplace (0% fee from direct links)</span>
        </label>

        {/* Priority toggle — Creator only */}
        <label className={`flex items-center gap-3 cursor-pointer ${!isCreator ? 'opacity-50' : ''}`}>
          <input
            type="checkbox"
            checked={marketplacePriority}
            onChange={(e) => {
              if (!isCreator) return;
              setMarketplacePriority(e.target.checked);
            }}
            disabled={!isCreator}
            data-testid="marketplace-priority-toggle"
            className="h-4 w-4 rounded accent-violet-600 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-gray-700">
            Enable priority indexing{' '}
            {!isCreator && (
              <Link href="/pricing" className="text-violet-600 hover:underline text-xs">
                (Creator plan)
              </Link>
            )}
          </span>
        </label>

        {isCreator && marketplacePriority && (
          <p className="mt-2 text-xs text-green-600 font-medium">
            ✓ Priority indexing active — your course ranks higher in search results
          </p>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {warnings.map((w) => <p key={w}>⚠ {w}</p>)}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          data-testid="save-premium-settings"
          className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save settings'}
        </button>
        {!isCreator && (
          <Link
            href="/pricing"
            className="text-sm text-violet-600 hover:underline font-medium"
          >
            Upgrade to Creator →
          </Link>
        )}
      </div>
    </div>
  );
}
