'use client';

/**
 * PlanBadge — displays the creator's current plan inline.
 * Shows "Free" or "Creator ✓" with appropriate styling.
 * Optional `showUpgrade` shows "Upgrade →" link for free users.
 */

import Link from 'next/link';

interface PlanBadgeProps {
  plan: 'free' | 'creator';
  showUpgrade?: boolean;
  size?: 'xs' | 'sm';
}

export function PlanBadge({ plan, showUpgrade = false, size = 'sm' }: PlanBadgeProps) {
  const textSize = size === 'xs' ? 'text-xs' : 'text-sm';

  if (plan === 'creator') {
    return (
      <span
        data-testid="plan-badge-creator"
        className={`inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 ${textSize} font-semibold text-violet-700`}
      >
        ✦ Creator
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span
        data-testid="plan-badge-free"
        className={`inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 ${textSize} font-medium text-gray-600`}
      >
        Free
      </span>
      {showUpgrade && (
        <Link
          href="/pricing"
          data-testid="plan-badge-upgrade-link"
          className={`${textSize} font-semibold text-violet-600 hover:text-violet-700 hover:underline`}
        >
          Upgrade →
        </Link>
      )}
    </span>
  );
}

/**
 * FeatureGate — wraps a UI element with a lock overlay + upgrade CTA for free users.
 */
interface FeatureGateProps {
  allowed: boolean;
  featureName: string;
  children: React.ReactNode;
  inline?: boolean;
}

export function FeatureGate({ allowed, featureName, children, inline = false }: FeatureGateProps) {
  if (allowed) return <>{children}</>;

  if (inline) {
    return (
      <span className="inline-flex items-center gap-2 opacity-50 cursor-not-allowed" data-testid={`feature-gate-${featureName}`}>
        {children}
        <Link
          href="/pricing"
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-semibold text-violet-600 hover:underline opacity-100 cursor-pointer"
        >
          🔒 Upgrade
        </Link>
      </span>
    );
  }

  return (
    <div className="relative" data-testid={`feature-gate-${featureName}`}>
      <div className="opacity-40 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Link
          href="/pricing"
          className="flex items-center gap-1.5 rounded-full bg-white border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm hover:bg-violet-50 transition-colors"
        >
          🔒 Creator plan required
        </Link>
      </div>
    </div>
  );
}
