import { browser } from '$app/environment';

/**
 * Fire-and-forget Temps Analytics page_view.
 *
 * Temps' analytics ingest is the same-origin path `/api/_temps/event`, which only exists when the
 * app is served through the Temps proxy. All production domains (szkolyjogi.pl + *.rzeka.live) are
 * served through Temps now, so fire everywhere except local dev; if a host ever isn't behind the
 * proxy, the 404 response is ignored. Wire format matches @temps-sdk/react-analytics
 * (event_name "page_view" + request_path/query/domain + event_data). Never throws.
 */
export function trackTempsPageview(pathname: string, searchParams: URLSearchParams): void {
	if (!browser) return;
	if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;

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
