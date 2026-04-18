import * as React from 'react';
import { cn } from '../lib/utils';

export interface ProgressBarProps {
  value: number;       // 0–100
  max?: number;
  label?: string;
  showPct?: boolean;
  className?: string;
  barClassName?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPct = true,
  className,
  barClassName,
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full', className)}>
      {(label || showPct) && (
        <div className="mb-1 flex justify-between text-sm text-gray-600">
          {label && <span>{label}</span>}
          {showPct && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn('h-full rounded-full bg-indigo-600 transition-all', barClassName)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
};
