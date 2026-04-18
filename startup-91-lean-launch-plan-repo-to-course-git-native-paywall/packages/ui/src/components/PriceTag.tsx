import * as React from 'react';
import { cn } from '../lib/utils';

export interface PriceTagProps {
  priceCents: number;
  currency?: string;
  className?: string;
  showFree?: boolean;
}

export const PriceTag: React.FC<PriceTagProps> = ({
  priceCents,
  currency = 'usd',
  className,
  showFree = true,
}) => {
  if (priceCents === 0 && showFree) {
    return (
      <span className={cn('font-semibold text-green-600', className)}>Free</span>
    );
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);

  return <span className={cn('font-semibold text-gray-900', className)}>{formatted}</span>;
};
