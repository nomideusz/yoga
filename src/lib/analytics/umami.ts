import { browser } from '$app/environment';

export type UmamiProps = Record<string, string | number | boolean | undefined | null>;

declare global {
	interface Window {
		umami?: {
			track: (event: string, data?: Record<string, string | number | boolean>) => void;
		};
	}
}

/** Fire-and-forget Umami custom event. Never throws. */
export function trackUmami(event: string, data?: UmamiProps): void {
	if (!browser) return;

	const payload = data ? compact(data) : undefined;

	try {
		window.umami?.track(event, payload as Record<string, string | number | boolean>);
	} catch {
		// Analytics must not affect UX.
	}
}

function compact(data: UmamiProps): UmamiProps {
	const out: UmamiProps = {};
	for (const [key, value] of Object.entries(data)) {
		if (value !== undefined && value !== null && value !== '') {
			out[key] = value;
		}
	}
	return out;
}

export function trunc(value: string, max = 80): string {
	return value.length > max ? `${value.slice(0, max)}…` : value;
}

const RESERVED_SEGMENTS = new Set([
	'about',
	'terms',
	'post',
	'category',
	'listing',
	'admin',
	'lab',
	'api',
]);

export function classifyPath(pathname: string): UmamiProps {
	const segments = pathname.split('/').filter(Boolean);

	if (pathname === '/') return { section: 'home' };
	if (pathname === '/about') return { section: 'about' };
	if (pathname === '/terms') return { section: 'terms' };
	if (pathname === '/post') return { section: 'post' };
	if (pathname.startsWith('/category/')) {
		return { section: 'category', slug: segments[1] ?? 'unknown' };
	}
	if (pathname.startsWith('/listing/')) {
		return { section: 'listing-legacy', id: segments[1] ?? 'unknown' };
	}
	if (pathname.startsWith('/admin/')) {
		return { section: 'admin', page: segments[1] ?? 'index' };
	}
	if (pathname.startsWith('/lab/')) {
		return { section: 'lab', page: segments[1] ?? 'index' };
	}
	if (segments.length >= 3 && segments[2] === 'claim') {
		return { section: 'claim', city: segments[0], listing: segments[1] };
	}
	if (segments.length === 2 && !RESERVED_SEGMENTS.has(segments[0])) {
		return { section: 'listing', city: segments[0], slug: segments[1] };
	}
	if (segments.length === 1 && !RESERVED_SEGMENTS.has(segments[0])) {
		return { section: 'city', city: segments[0] };
	}

	return { section: 'other', path: trunc(pathname, 120) };
}

/** SPA navigation — enriches Umami pageviews with route context. */
export function trackNavigation(
	pathname: string,
	searchParams: URLSearchParams,
	locale?: string,
): void {
	const ctx = classifyPath(pathname);

	if (locale) ctx.locale = locale;

	const style = searchParams.get('style');
	const page = searchParams.get('page');
	if (style) ctx.style = style;
	if (page) ctx.page = page;

	trackUmami('navigation', ctx);
}

export function trackSearch(params: {
	query: string;
	action: string;
	layer?: string;
	page?: string;
	resultType?: string;
	city?: string;
	resultCount?: number;
}): void {
	trackUmami('search', {
		query: trunc(params.query),
		action: params.action,
		layer: params.layer,
		page: params.page,
		result_type: params.resultType,
		city: params.city,
		result_count: params.resultCount,
	});
}

export function trackCityView(city: string, schoolCount: number): void {
	trackUmami('city-view', { city, school_count: schoolCount });
}

export function trackCategoryView(slug: string, styleName: string, schoolCount: number): void {
	trackUmami('category-view', {
		slug,
		style: styleName,
		school_count: schoolCount,
	});
}

export function trackListingView(params: {
	city: string;
	slug: string;
	name: string;
	styles?: string;
}): void {
	trackUmami('listing-view', {
		city: params.city,
		slug: params.slug,
		name: trunc(params.name, 120),
		styles: params.styles ? trunc(params.styles, 120) : undefined,
	});
}

export function trackLocaleChange(locale: string): void {
	trackUmami('locale-change', { locale });
}
