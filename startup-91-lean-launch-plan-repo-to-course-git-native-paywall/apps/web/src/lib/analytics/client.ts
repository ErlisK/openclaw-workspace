'use client';

export type EventName = string;

export function trackClient(eventName: EventName, properties?: Record<string, unknown>): void {
  const body = JSON.stringify({ event_name: eventName, properties: properties ?? {} });
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon('/api/events', body);
  } else {
    fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => null);
  }
}
