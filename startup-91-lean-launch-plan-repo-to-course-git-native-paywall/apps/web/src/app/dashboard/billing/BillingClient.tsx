'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SubscriptionStatus {
  authenticated: boolean;
  plan: 'free' | 'creator';
  planName: string;
  subscription: {
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    stripe_price_id: string | null;
  } | null;
}

export default function BillingClient() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [urlParams, setUrlParams] = useState<{ subscribed?: string; cancelled?: string }>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUrlParams({
      subscribed: params.get('subscribed') ?? undefined,
      cancelled: params.get('cancelled') ?? undefined,
    });

    fetch('/api/subscription/status', { credentials: 'include' })
      .then((r) => r.json())
      .then(setStatus)
      .catch(console.error);
  }, []);

  async function openPortal() {
    setLoadingPortal(true);
    try {
      const res = await fetch('/api/creator-portal', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? 'Could not open billing portal');
    } catch {
      alert('Network error');
    } finally {
      setLoadingPortal(false);
    }
  }

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading billing status…</div>
      </div>
    );
  }

  const isCreator = status.plan === 'creator';
  const periodEnd = status.subscription?.current_period_end
    ? new Date(status.subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="mb-8">
          <Link href="/dashboard/courses" className="text-sm text-gray-500 hover:text-gray-700">← Back to dashboard</Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">Billing & Plan</h1>

        {urlParams.subscribed && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-4 mb-6 flex items-center gap-3">
            <span className="text-green-600 text-xl">🎉</span>
            <div>
              <p className="font-semibold text-green-900">You&apos;re on the Creator plan!</p>
              <p className="text-sm text-green-700 mt-0.5">Your subscription is now active. All Creator features are unlocked.</p>
            </div>
          </div>
        )}

        {urlParams.cancelled && (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-5 py-4 mb-6">
            <p className="text-sm text-yellow-800">Checkout was cancelled. Your plan was not changed.</p>
          </div>
        )}

        {/* Current plan card */}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Current Plan</div>
              <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {status.planName}
                {isCreator && (
                  <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">Active</span>
                )}
              </div>
              {isCreator && status.subscription && (
                <div className="mt-2 text-sm text-gray-500">
                  {status.subscription.cancel_at_period_end
                    ? <span className="text-amber-600">Cancels {periodEnd}</span>
                    : <span>Renews {periodEnd}</span>
                  }
                  {' · '}
                  <span className="capitalize">{status.subscription.status}</span>
                </div>
              )}
              {!isCreator && (
                <div className="mt-2 text-sm text-gray-500">
                  Free forever · self-hosted · 3 courses · 10 lessons each
                </div>
              )}
            </div>
            {isCreator ? (
              <button
                onClick={openPortal}
                disabled={loadingPortal}
                data-testid="manage-billing-btn"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {loadingPortal ? 'Opening…' : 'Manage billing'}
              </button>
            ) : (
              <Link
                href="/pricing"
                data-testid="upgrade-btn"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
              >
                Upgrade →
              </Link>
            )}
          </div>
        </div>

        {/* Feature list */}
        {!isCreator && (
          <div className="rounded-2xl bg-violet-50 border border-violet-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Unlock with Creator plan ($29/mo)</h2>
            <ul className="space-y-2 text-sm text-gray-700 mb-5">
              {[
                'Unlimited courses & lessons',
                'Custom domain',
                'Marketplace listing & discovery',
                'Unlimited AI quiz generation',
                '90-day analytics retention',
                'Priority email support',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-violet-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link
              href="/pricing"
              data-testid="upgrade-cta-banner"
              className="inline-flex rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              See pricing →
            </Link>
          </div>
        )}

        {isCreator && (
          <div className="rounded-2xl bg-white border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Creator plan features</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              {[
                'Unlimited courses & lessons',
                'Custom domain',
                'Marketplace listing',
                'Unlimited AI quiz generation',
                '90-day analytics',
                'Priority support',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
