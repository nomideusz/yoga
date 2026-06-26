import { browser } from '$app/environment';

/**
 * Fire-and-forget Temps Analytics page_view.
 *
 * Temps' analytics ingest is the same-origin path `/api/_temps/event`, which only exists when the
 * app is served through the Temps proxy. So we only fire on Temps-served hosts (`*.rzeka.live`); on
 * Vercel (szkolyjogi.pl) the path 404s, so we skip it. Wire format matches @temps-sdk/react-analytics
 * (event_name "page_view" + request_path/query/domain + event_data). Never throws.
 */
export function trackTempsPageview(pathname: string, searchParams: URLSearchParams): void {
	if (!browser) return;
	if (!location.hostname.endsWith('.rzeka.live')) return;

	try {
		const qs = searchParams.toString();
		const body = JSON.stringify({
			event_name: 'page_view',
			request_query: qs ? `?${qs}` : '',
			request_path: pathname,
			domain: location.hostname,
			event_data: {
				referrer: document.referrer,
				userAgent: navigator.userAgent,
				timestamp: new Date().toISOString()
			}
		});
		// keepalive so the event survives a fast navigation/unload
		void fetch('/api/_temps/event', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
			keepalive: true
		}).catch(() => {});
	} catch {
		// Analytics must not affect UX.
	}
}
