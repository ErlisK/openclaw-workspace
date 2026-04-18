import * as React from 'react';
import { cn } from '../lib/utils';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', className)}
    {...props}
  />
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn('p-6 pt-0', className)} {...props} />;

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn('flex items-center p-6 pt-0', className)} {...props} />;
