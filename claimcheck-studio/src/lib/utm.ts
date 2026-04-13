/**
 * UTM & referrer capture utility (client-side only).
 * On first page load, reads URL params + document.referrer and stores them
 * in localStorage so they survive navigations within the same session.
 */

export interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  pathname?: string;
}

const STORAGE_KEY = "_cc_utm";

/** Parse UTMs from current URL params. Returns empty strings for missing params. */
function parseFromUrl(): UtmData {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    utm_content: params.get("utm_content") || undefined,
    utm_term: params.get("utm_term") || undefined,
    referrer: document.referrer || undefined,
    pathname: window.location.pathname + window.location.search,
  };
}

/**
 * Get UTM data: use stored values if present (first-touch),
 * otherwise capture from current URL and store.
 */
export function getOrCaptureUtm(): UtmData {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as UtmData;
    }
  } catch {
    // ignore storage errors
  }

  const data = parseFromUrl();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }

  return data;
}

/** Clear stored UTM data (e.g., after conversion). */
export function clearUtm(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
