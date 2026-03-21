// ============================================================
// @nomideusz/svelte-search — Search event tracker
// ============================================================
// Lightweight fire-and-forget search analytics.
// No PII — sessionId is a random UUID in sessionStorage.
export function createTracker(config = {}) {
    const endpoint = config.endpoint ?? '/api/search-events';
    const sessionKey = config.sessionKey ?? 'search_sid';
    function getSessionId() {
        if (typeof sessionStorage === 'undefined')
            return '';
        let sid = sessionStorage.getItem(sessionKey);
        if (!sid) {
            sid = crypto.randomUUID();
            sessionStorage.setItem(sessionKey, sid);
        }
        return sid;
    }
    function track(event) {
        try {
            const body = { ...event, sessionId: getSessionId() };
            const payload = JSON.stringify(body);
            if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
                navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
            }
            else if (typeof fetch !== 'undefined') {
                fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload,
                    keepalive: true,
                }).catch(() => { });
            }
        }
        catch {
            // Never fail the user experience for tracking
        }
    }
    return { track };
}
