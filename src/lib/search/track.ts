// Lightweight search event tracker.
// Fires POST /api/search-events in the background (fire-and-forget).
// No PII — sessionId is a random UUID stored in sessionStorage.

const SESSION_KEY = 'asini_search_sid';

function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return '';
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export interface TrackSearchEvent {
  query: string;
  queryNormalized?: string;
  page: 'main' | 'city' | 'style';
  cityContext?: string;
  action: string;
  layer?: 'client' | 'server' | 'google' | 'none';
  resultCount?: number;
  clickedType?: 'school' | 'city' | 'style' | 'address' | 'redirect' | 'postal' | 'district' | 'google-place';
  clickedId?: string;
}

export function trackSearch(event: TrackSearchEvent): void {
  try {
    const body = { ...event, sessionId: getSessionId() };
    // Use sendBeacon where available for reliability on page navigation
    const payload = JSON.stringify(body);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/search-events', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/search-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Never fail the user experience for tracking
  }
}
