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
 * - Does NOT cache the photo (Google ToS prohibits pre-fetching/storing).
 * - Uses skipHttpRedirect=true to get the CDN URL, then redirects browser there.
 * - Each request = 1 Places Photo API call (1000/month free tier).
 */
export const GET: RequestHandler = async ({ params }) => {
	const apiKey = env.GOOGLE_API_KEY || env.GOOGLE_MAPS_API_KEY;
	if (!apiKey) throw error(500, 'Google API key not configured');

	const [school] = await db
		.select({ photoReference: schools.photoReference })
		.from(schools)
		.where(eq(schools.id, params.id))
		.limit(1);

	if (!school?.photoReference) throw error(404, 'No photo available');

	const ref = school.photoReference;

	if (ref.startsWith('places/')) {
		// Places API (New): get CDN URL via skipHttpRedirect
		const metaUrl = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=800&key=${apiKey}&skipHttpRedirect=true`;
		const res = await fetch(metaUrl);

		if (!res.ok) {
			console.error(`Google photo fetch failed: ${res.status} for ${params.id}`);
			throw error(502, 'Photo unavailable');
		}

		const data = await res.json();
		if (data.photoUri) {
			// Redirect browser to Google's CDN — no API key in URL
			redirect(302, data.photoUri);
		}

		// Fallback: let Google handle the redirect itself
		redirect(302, `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=800&key=${apiKey}`);
	}

	// Legacy API format
	redirect(302, `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${apiKey}`);
};
