'use client';

import * as React from 'react';

interface PricingFormProps {
  courseId: string;
  initialPriceCents: number;
  initialCurrency: string;
  initialStripeProductId?: string | null;
  initialStripePriceId?: string | null;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const CURRENCIES = ['usd', 'eur', 'gbp', 'cad', 'aud'];

export function PricingForm({
  courseId,
  initialPriceCents,
  initialCurrency,
  initialStripeProductId,
  initialStripePriceId,
}: PricingFormProps) {
  const [priceCents, setPriceCents] = React.useState(initialPriceCents);
  const [currency, setCurrency] = React.useState((initialCurrency ?? 'usd').toLowerCase());
  const [stripeProductId, setStripeProductId] = React.useState(initialStripeProductId ?? null);
  const [stripePriceId, setStripePriceId] = React.useState(initialStripePriceId ?? null);
  const [saveState, setSaveState] = React.useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  // Display price in dollars
  const displayDollars = priceCents === 0 ? '' : (priceCents / 100).toFixed(0);

  function handlePriceInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const dollars = raw === '' ? 0 : Math.min(parseInt(raw, 10), 99999);
    setPriceCents(dollars * 100);
  }

  const isFree = priceCents === 0;
  const isDirty = priceCents !== initialPriceCents || currency !== initialCurrency;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty) return;
    setSaveState('saving');
    setErrorMsg('');

    try {
      const res = await fetch(`/api/courses/${courseId}/pricing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_cents: priceCents, currency }),
      });
      const data = await res.json() as {
        price_cents?: number;
        currency?: string;
        stripe_product_id?: string | null;
        stripe_price_id?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to save pricing');
        setSaveState('error');
        return;
      }
      setStripeProductId(data.stripe_product_id ?? null);
      setStripePriceId(data.stripe_price_id ?? null);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch {
      setErrorMsg('Network error — please try again');
      setSaveState('error');
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4" aria-label="Pricing form">
      {/* Free / Paid toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPriceCents(0)}
          className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
            isFree
              ? 'border-violet-500 bg-violet-50 text-violet-700'
              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
          }`}
          aria-pressed={isFree}
        >
          Free
        </button>
        <button
          type="button"
          onClick={() => { if (isFree) setPriceCents(2900); }}
          className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
            !isFree
              ? 'border-violet-500 bg-violet-50 text-violet-700'
              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
          }`}
          aria-pressed={!isFree}
        >
          Paid
        </button>
      </div>

      {/* Price + currency */}
      {!isFree && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">
              $
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={displayDollars}
              onChange={handlePriceInput}
              placeholder="29"
              aria-label="Price amount"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-7 pr-3 text-sm text-gray-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              data-testid="price-input"
            />
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Currency"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-violet-400 focus:outline-none"
            data-testid="currency-select"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>
        </div>
      )}

      {/* Stripe IDs (informational) */}
      {!isFree && (stripeProductId || stripePriceId) && (
        <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs font-mono text-gray-400 space-y-1" data-testid="stripe-ids">
          {stripeProductId && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-300">Product:</span>
              <span className="truncate">{stripeProductId}</span>
            </div>
          )}
          {stripePriceId && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-300">Price:</span>
              <span className="truncate">{stripePriceId}</span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {saveState === 'error' && (
        <p className="text-xs text-red-600" role="alert">{errorMsg}</p>
      )}

      {/* Save button */}
      <button
        type="submit"
        disabled={!isDirty || saveState === 'saving'}
        className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${
          saveState === 'saved'
            ? 'bg-green-500 text-white cursor-default'
            : isDirty && saveState !== 'saving'
            ? 'bg-violet-600 text-white hover:bg-violet-700'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
        data-testid="save-pricing-btn"
      >
        {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : 'Save pricing'}
      </button>

      <p className="text-xs text-gray-400">
        {isFree
          ? 'All learners can access this course at no cost.'
          : 'A Stripe Checkout session will be created for new purchases. Existing enrollments are not affected.'}
      </p>
    </form>
  );
}
