'use client';
/**
 * components/JurisdictionSelector.tsx
 * Drop-down for choosing jurisdiction with built-in geofencing warning.
 * Usage:
 *   <JurisdictionSelector value={code} onChange={setCode} />
 */

import { useState } from 'react';
import { JURISDICTION_OPTIONS } from '@/lib/jurisdiction';
import { JurisdictionWarning } from './JurisdictionWarning';

interface Props {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  className?: string;
}

export function JurisdictionSelector({
  value,
  onChange,
  label = 'Governing jurisdiction',
  className = '',
}: Props) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {/* V1 supported group */}
        <optgroup label="✅ Fully supported (v1)">
          {JURISDICTION_OPTIONS.filter((o) => o.supported).map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </optgroup>

        {/* Coming soon / warning group */}
        <optgroup label="⚠️ Limited support (warning will show)">
          {JURISDICTION_OPTIONS.filter((o) => !o.supported).map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </optgroup>
      </select>

      {/* Inline warning — only appears for non-v1 jurisdictions */}
      <JurisdictionWarning jurisdictionCode={value} />
    </div>
  );
}

export default JurisdictionSelector;
