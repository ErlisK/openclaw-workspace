'use client';
/**
 * components/JurisdictionWarning.tsx
 * Displays a yellow warning banner when a user selects a non-v1 jurisdiction.
 * Usage:
 *   <JurisdictionWarning jurisdictionCode={selectedCode} />
 */

import { getJurisdictionWarning, isV1Supported, JURISDICTION_LABELS } from '@/lib/jurisdiction';

interface Props {
  jurisdictionCode: string;
  className?: string;
}

export function JurisdictionWarning({ jurisdictionCode, className = '' }: Props) {
  const warning = getJurisdictionWarning(jurisdictionCode);

  // No warning for v1 supported jurisdictions
  if (!warning) return null;

  const label = JURISDICTION_LABELS[jurisdictionCode] ?? jurisdictionCode;

  return (
    <div
      role="alert"
      className={`rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900 ${className}`}
    >
      {/* Icon + heading */}
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-yellow-500" aria-hidden>
          {/* Warning triangle SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd" />
          </svg>
        </span>
        <div>
          <p className="font-semibold">
            {label} is not fully supported in v1
          </p>
          <p className="mt-1 leading-relaxed">
            {warning}
          </p>
          <p className="mt-2 text-yellow-800">
            <strong>You can still export this template.</strong>{' '}
            For full legal coverage, switch to{' '}
            <span className="font-medium">United States</span> or{' '}
            <span className="font-medium">United Kingdom</span>, or{' '}
            consult a local attorney before use.
          </p>
        </div>
      </div>
    </div>
  );
}

export default JurisdictionWarning;
