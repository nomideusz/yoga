import { error, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { schools } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/**
 * Photo proxy — 302 redirects to Google Places photo CDN URL.
 *
 * Three-tier caching (cheapest first):
 *   1. Memory cache  → instant, survives within function instance
 *   2. DB (image_url) → persistent across cold starts, 1 Turso read
 *   3. Google API     → only on first-ever visit or expired CDN URL
 *
 * After every school is visited once, Google API calls drop to ~zero.
 * Self-healing refreshes expired refs via Place Details (photos only).
 */

interface CachedPhoto {
	cdnUrl: string;
	photoRef: string;
	googlePlaceId: string;
	expiresAt: number;
}

// ── Memory cache (fast layer, lost on cold start) ──
const MEMORY_CACHE = new Map<string, CachedPhoto>();
const MEMORY_TTL_MS = 24 * 60 * 60 * 1000;

// ── 404 caches (avoid repeated lookups) ──
const NOT_FOUND = new Set<string>();         // no photo_reference in DB
const CDN_FAILURES = new Map<string, number>(); // schoolId → failure timestamp
const FAILURE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ── Periodic cleanup ──
let lastCleanup = Date.now();
function cleanup() {
	const now = Date.now();
	if (now - lastCleanup < 60 * 60 * 1000) return;
	lastCleanup = now;
	for (const [k, v] of MEMORY_CACHE) if (v.expiresAt < now) MEMORY_CACHE.delete(k);
	for (const [k, ts] of CDN_FAILURES) if (now - ts > FAILURE_COOLDOWN_MS) CDN_FAILURES.delete(k);
	// NOT_FOUND is small and permanent — schools rarely gain photos
}

// ── Google API helpers ──

async function getCdnUrl(ref: string, apiKey: string): Promise<string | null> {
	if (!ref.startsWith('places/')) return null;
	const res = await fetch(
		`https://places.googleapis.com/v1/${ref}/media?maxWidthPx=800&key=${apiKey}&skipHttpRedirect=true`,
	);
	if (!res.ok) return null;
	const data = await res.json();
	return data.photoUri || null;
}

async function refreshFromPlaceDetails(
	googlePlaceId: string,
	apiKey: string,
): Promise<{ photoReference: string; photoAuthor: string; photoAuthorUrl: string } | null> {
	if (!googlePlaceId) return null;
	const res = await fetch(
		`https://places.googleapis.com/v1/places/${googlePlaceId}?key=${apiKey}`,
		{ headers: { 'X-Goog-FieldMask': 'photos' } },
	);
	if (!res.ok) return null;
	const data = await res.json();
	const photos: Array<{ name?: string; widthPx?: number; heightPx?: number; authorAttributions?: Array<{ displayName?: string; uri?: string }> }> = data.photos || [];
	if (!photos.length) return null;

	// Prefer landscape photos (width > height) to avoid vertical crops
	const photo = photos.find((p) => (p.widthPx ?? 0) > (p.heightPx ?? 0)) ?? photos[0];
	if (!photo?.name) return null;

	const attr = photo.authorAttributions?.[0];
	return {
		photoReference: photo.name,
		photoAuthor: attr?.displayName || '',
		photoAuthorUrl: attr?.uri || '',
	};
}

/** Save CDN URL + attribution to DB (fire-and-forget). */
function persistToDb(
	schoolId: string,
	cdnUrl: string,
	photoRef?: string,
	photoAuthor?: string,
	photoAuthorUrl?: string,
) {
	const updates: Record<string, string> = { imageUrl: cdnUrl };
	if (photoRef) updates.photoReference = photoRef;
	if (photoAuthor !== undefined) updates.photoAuthor = photoAuthor;
	if (photoAuthorUrl !== undefined) updates.photoAuthorUrl = photoAuthorUrl;

	db.update(schools)
		.set(updates)
		.where(eq(schools.id, schoolId))
		.catch((e) => console.error(`DB write failed for ${schoolId}:`, e));
}

function cacheAndRedirect(
	schoolId: string,
	cdnUrl: string,
	photoRef: string,
	googlePlaceId: string,
	setHeaders: (headers: Record<string, string>) => void,
): never {
	MEMORY_CACHE.set(schoolId, {
		cdnUrl,
		photoRef,
		googlePlaceId,
		expiresAt: Date.now() + MEMORY_TTL_MS,
	});
	setHeaders({ 'Cache-Control': 'public, max-age=86400' });
	redirect(302, cdnUrl);
}

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const apiKey = env.GOOGLE_MAPS_API_KEY;
	if (!apiKey) throw error(500, 'Google API key not configured');

	const schoolId = params.id;
	cleanup();

	// ── 1. Memory cache → instant (free) ──
	const mem = MEMORY_CACHE.get(schoolId);
	if (mem && mem.expiresAt > Date.now()) {
		setHeaders({ 'Cache-Control': 'public, max-age=86400' });
		redirect(302, mem.cdnUrl);
	}

	// ── 1b. Known 404 → skip everything ──
	if (NOT_FOUND.has(schoolId)) throw error(404, 'No photo available');

	// ── 2. DB read (1 Turso call — covers cold starts) ──
	const [school] = await db
		.select({
			imageUrl: schools.imageUrl,
			photoReference: schools.photoReference,
			googlePlaceId: schools.googlePlaceId,
		})
		.from(schools)
		.where(eq(schools.id, schoolId))
		.limit(1);

	if (!school?.photoReference) {
		NOT_FOUND.add(schoolId);
		throw error(404, 'No photo available');
	}

	// ── 2b. DB has cached CDN URL → use it (no Google call) ──
	if (school.imageUrl && school.imageUrl.startsWith('https://lh3.googleusercontent.com/')) {
		cacheAndRedirect(schoolId, school.imageUrl, school.photoReference, school.googlePlaceId ?? '', setHeaders);
	}

	// ── 3. Google API → resolve photo_reference to CDN URL ──
	let cdnUrl = await getCdnUrl(school.photoReference, apiKey);

	// ── 4. Self-heal if expired ──
	if (!cdnUrl && school.googlePlaceId) {
		const failedAt = CDN_FAILURES.get(schoolId);
		if (!failedAt || Date.now() - failedAt > FAILURE_COOLDOWN_MS) {
			console.log(`Photo ref expired for ${schoolId}, refreshing...`);
			const fresh = await refreshFromPlaceDetails(school.googlePlaceId, apiKey);

			if (fresh?.photoReference) {
				cdnUrl = await getCdnUrl(fresh.photoReference, apiKey);
				if (cdnUrl) {
					persistToDb(schoolId, cdnUrl, fresh.photoReference, fresh.photoAuthor, fresh.photoAuthorUrl);
					cacheAndRedirect(schoolId, cdnUrl, fresh.photoReference, school.googlePlaceId, setHeaders);
				}
			}

			if (!cdnUrl) {
				CDN_FAILURES.set(schoolId, Date.now());
				throw error(404, 'Photo unavailable');
			}
		} else {
			throw error(404, 'Photo unavailable');
		}
	}

	if (!cdnUrl) throw error(404, 'Photo unavailable');

	// ── 5. Save CDN URL to DB + memory, redirect ──
	persistToDb(schoolId, cdnUrl);
	cacheAndRedirect(schoolId, cdnUrl, school.photoReference, school.googlePlaceId ?? '', setHeaders);
};
