import { error, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { schools } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/**
 * Photo proxy — 302 redirects to Google Places photo CDN URL.
 *
 * - Keeps the API key server-side (never exposed to browser).
 * - Caches CDN URL in memory (1h TTL) — NOT the photo itself.
 * - Self-healing: if a photo_reference expires, auto-refreshes it via
 *   Place Details API (photos field only — cheapest call).
 *   Only refreshes on actual visits, so you never pay for unseen photos.
 */

interface CacheEntry {
	cdnUrl: string;
	expiresAt: number;
}

const CDN_URL_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Track recently failed refreshes to avoid hammering Google
const REFRESH_FAILURES = new Map<string, number>(); // schoolId → timestamp
const REFRESH_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h cooldown after failure

// Cleanup stale entries every 10 minutes
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

function cleanupCache() {
	const now = Date.now();
	if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
	lastCleanup = now;
	for (const [key, entry] of CDN_URL_CACHE) {
		if (entry.expiresAt < now) CDN_URL_CACHE.delete(key);
	}
	for (const [key, ts] of REFRESH_FAILURES) {
		if (now - ts > REFRESH_COOLDOWN_MS) REFRESH_FAILURES.delete(key);
	}
}

/**
 * Fetch a fresh photo_reference from Place Details API using google_place_id.
 * Uses only the `photos` field mask — cheapest possible call.
 * Returns { photoReference, photoAuthor, photoAuthorUrl } or null.
 */
async function refreshPhotoReference(
	googlePlaceId: string,
	apiKey: string,
): Promise<{ photoReference: string; photoAuthor: string; photoAuthorUrl: string } | null> {
	if (!googlePlaceId) return null;

	const url = `https://places.googleapis.com/v1/places/${googlePlaceId}?key=${apiKey}`;
	const res = await fetch(url, {
		headers: {
			'X-Goog-FieldMask': 'photos',
		},
	});

	if (!res.ok) return null;

	const data = await res.json();
	const photos = data.photos;
	if (!photos?.length) return null;

	const photo = photos[0];
	const attrs = photo.authorAttributions?.[0];

	return {
		photoReference: photo.name || '',
		photoAuthor: attrs?.displayName || '',
		photoAuthorUrl: attrs?.uri || '',
	};
}

/**
 * Try to get CDN URL from a photo reference.
 * Returns the CDN URL string or null if the reference is expired/invalid.
 */
async function getCdnUrl(ref: string, apiKey: string): Promise<string | null> {
	if (!ref.startsWith('places/')) return null;

	const metaUrl = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=800&key=${apiKey}&skipHttpRedirect=true`;
	const res = await fetch(metaUrl);

	if (!res.ok) return null;

	const data = await res.json();
	return data.photoUri || null;
}

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const apiKey = env.GOOGLE_API_KEY || env.GOOGLE_MAPS_API_KEY;
	if (!apiKey) throw error(500, 'Google API key not configured');

	const schoolId = params.id;

	// Check CDN URL cache first
	cleanupCache();
	const cached = CDN_URL_CACHE.get(schoolId);
	if (cached && cached.expiresAt > Date.now()) {
		setHeaders({ 'Cache-Control': 'public, max-age=3600' });
		redirect(302, cached.cdnUrl);
	}

	// DB lookup
	const [school] = await db
		.select({
			photoReference: schools.photoReference,
			googlePlaceId: schools.googlePlaceId,
		})
		.from(schools)
		.where(eq(schools.id, schoolId))
		.limit(1);

	if (!school?.photoReference) throw error(404, 'No photo available');

	// Try current photo reference
	let cdnUrl = await getCdnUrl(school.photoReference, apiKey);

	// If expired, try self-healing refresh (unless on cooldown)
	if (!cdnUrl && school.googlePlaceId) {
		const failedAt = REFRESH_FAILURES.get(schoolId);
		if (!failedAt || Date.now() - failedAt > REFRESH_COOLDOWN_MS) {
			console.log(`Photo ref expired for ${schoolId}, refreshing via Place Details...`);
			const fresh = await refreshPhotoReference(school.googlePlaceId, apiKey);

			if (fresh?.photoReference) {
				// Update DB with fresh reference (fire-and-forget)
				db.update(schools)
					.set({
						photoReference: fresh.photoReference,
						photoAuthor: fresh.photoAuthor,
						photoAuthorUrl: fresh.photoAuthorUrl,
					})
					.where(eq(schools.id, schoolId))
					.then(() => console.log(`Refreshed photo ref for ${schoolId}`))
					.catch((e) => console.error(`Failed to save photo ref for ${schoolId}:`, e));

				// Try the new reference
				cdnUrl = await getCdnUrl(fresh.photoReference, apiKey);
			}

			if (!cdnUrl) {
				REFRESH_FAILURES.set(schoolId, Date.now());
			}
		}
	}

	if (!cdnUrl) throw error(404, 'Photo unavailable');

	// Cache and redirect
	CDN_URL_CACHE.set(schoolId, {
		cdnUrl,
		expiresAt: Date.now() + CACHE_TTL_MS,
	});
	setHeaders({ 'Cache-Control': 'public, max-age=3600' });
	redirect(302, cdnUrl);
};
