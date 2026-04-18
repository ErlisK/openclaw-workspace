import * as React from 'react';

type CalloutType = 'info' | 'warning' | 'danger' | 'tip';

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}

const styles: Record<CalloutType, { bg: string; border: string; icon: string; label: string }> = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-300 dark:border-blue-700',
    icon: 'ℹ️',
    label: 'Info',
  },
  tip: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-300 dark:border-green-700',
    icon: '💡',
    label: 'Tip',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-300 dark:border-amber-700',
    icon: '⚠️',
    label: 'Warning',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-300 dark:border-red-700',
    icon: '🚨',
    label: 'Danger',
  },
};

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const s = styles[type];
  return (
    <div
      className={`my-6 flex gap-3 rounded-lg border-l-4 p-4 ${s.bg} ${s.border}`}
      role="note"
    >
      <span className="flex-shrink-0 text-lg leading-6" aria-hidden="true">
        {s.icon}
      </span>
      <div className="min-w-0">
        {(title || type !== 'info') && (
          <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title ?? s.label}
          </p>
        )}
        <div className="text-sm text-gray-700 dark:text-gray-300 [&_p]:m-0 [&_code]:font-mono [&_code]:text-xs">
          {children}
        </div>
      </div>
    </div>
  );
}
