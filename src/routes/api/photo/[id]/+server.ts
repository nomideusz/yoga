import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { schools } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/**
 * Photo proxy — serves Google Places photo bytes from our origin.
 *
 * Google photo CDN URLs expire and may reject hotlinked browser requests.
 * We therefore fetch through the authenticated Places media endpoint and
 * let browser/CDN caching sit in front of this route.
 */

interface PhotoPayload {
	body: ArrayBuffer;
	contentType: string;
	contentLength: string | null;
}

// ── 404 caches (avoid repeated lookups) ──
const NOT_FOUND = new Set<string>(); // no photo available from Places
const PHOTO_FAILURES = new Map<string, number>(); // schoolId -> failure timestamp
const FAILURE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ── Periodic cleanup ──
let lastCleanup = Date.now();
function cleanup() {
	const now = Date.now();
	if (now - lastCleanup < 60 * 60 * 1000) return;
	lastCleanup = now;
	for (const [k, ts] of PHOTO_FAILURES) if (now - ts > FAILURE_COOLDOWN_MS) PHOTO_FAILURES.delete(k);
	// NOT_FOUND is small and permanent — schools rarely gain photos
}

// ── Google API helpers ──

async function fetchPhoto(ref: string, apiKey: string): Promise<PhotoPayload | null> {
	if (!ref.startsWith('places/')) return null;
	const res = await fetch(
		`https://places.googleapis.com/v1/${ref}/media?maxWidthPx=1200&key=${apiKey}`,
		{ redirect: 'follow' },
	);
	if (!res.ok) return null;

	const contentType = res.headers.get('content-type') ?? '';
	if (!contentType.startsWith('image/')) return null;

	return {
		body: await res.arrayBuffer(),
		contentType,
		contentLength: res.headers.get('content-length'),
	};
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

/** Save fresh photo metadata to DB (fire-and-forget). */
function persistPhotoMetadata(
	schoolId: string,
	photoRef: string,
	photoAuthor: string,
	photoAuthorUrl: string,
) {
	db.update(schools)
		.set({
			photoReference: photoRef,
			photoAuthor,
			photoAuthorUrl,
		})
		.where(eq(schools.id, schoolId))
		.catch((e) => console.error(`DB write failed for ${schoolId}:`, e));
}

function photoResponse(photo: PhotoPayload): Response {
	const headers = new Headers({
		'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
		'Content-Type': photo.contentType,
	});
	if (photo.contentLength) headers.set('Content-Length', photo.contentLength);
	return new Response(photo.body, { headers });
}

export const GET: RequestHandler = async ({ params }) => {
	const apiKey = env.GOOGLE_MAPS_API_KEY;
	if (!apiKey) throw error(500, 'Google API key not configured');

	const schoolId = params.id;
	cleanup();

	// ── 1. Known 404 → skip everything ──
	if (NOT_FOUND.has(schoolId)) throw error(404, 'No photo available');

	// ── 2. DB read (1 Turso call — covers cold starts) ──
	const [school] = await db
		.select({
			photoReference: schools.photoReference,
			googlePlaceId: schools.googlePlaceId,
		})
		.from(schools)
		.where(eq(schools.id, schoolId))
		.limit(1);

	if (!school) throw error(404, 'School not found');

	let photoReference = school.photoReference ?? '';

	// ── 3. Missing DB ref → try Place Details once ──
	if (!photoReference && school.googlePlaceId) {
		const fresh = await refreshFromPlaceDetails(school.googlePlaceId, apiKey);
		if (fresh?.photoReference) {
			photoReference = fresh.photoReference;
			persistPhotoMetadata(
				schoolId,
				fresh.photoReference,
				fresh.photoAuthor,
				fresh.photoAuthorUrl,
			);
		}
	}

	if (!photoReference) {
		NOT_FOUND.add(schoolId);
		throw error(404, 'No photo available');
	}

	// ── 4. Google Places media → image bytes ──
	let photo = await fetchPhoto(photoReference, apiKey);

	// ── 5. Self-heal expired refs via Place Details ──
	if (!photo && school.googlePlaceId) {
		const failedAt = PHOTO_FAILURES.get(schoolId);
		if (!failedAt || Date.now() - failedAt > FAILURE_COOLDOWN_MS) {
			const fresh = await refreshFromPlaceDetails(school.googlePlaceId, apiKey);
			if (fresh?.photoReference) {
				photo = await fetchPhoto(fresh.photoReference, apiKey);
				if (photo) {
					persistPhotoMetadata(
						schoolId,
						fresh.photoReference,
						fresh.photoAuthor,
						fresh.photoAuthorUrl,
					);
					PHOTO_FAILURES.delete(schoolId);
					return photoResponse(photo);
				}
			}

			PHOTO_FAILURES.set(schoolId, Date.now());
		}
	}

	if (!photo) throw error(404, 'Photo unavailable');

	return photoResponse(photo);
};
