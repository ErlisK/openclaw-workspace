'use client';
import { useCallback } from 'react';
import { trackClient } from '@/lib/analytics/client';

export function useAnalytics() {
  const track = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    trackClient(eventName, properties);
  }, []);
  return { track };
}
