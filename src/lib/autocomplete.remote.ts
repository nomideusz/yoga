import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	getCityCenterCoords,
	getCityCoords,
	checkPlacesBudget,
	recordPlacesCall
} from '$lib/server/db/queries/index';

export interface AutocompleteArgs {
	input: string;
	city?: string;
	lat?: number;
	lng?: number;
	sessionToken?: string;
}

export interface AutocompleteResult {
	suggestions: Array<{ description: string; placeId: string }>;
	error?: 'budget' | 'api_error';
}

/**
 * Google Places autocomplete as a remote query — the same logic as the old
 * `/api/autocomplete` `+server.ts`, but co-located and end-to-end typed. The
 * client calls `autocomplete({ input, city })` and gets back a typed
 * `AutocompleteResult`: no `URLSearchParams`, no `fetch`, no `res.json()`, and
 * no response shape kept in sync by hand.
 *
 * `'unchecked'` skips schema validation to match the original endpoint (which
 * did none). Production-grade would pass a Standard Schema validator (valibot /
 * zod / arktype) as the first argument instead, so client input is verified.
 */
export const autocomplete = query(
	'unchecked',
	async (args: AutocompleteArgs): Promise<AutocompleteResult> => {
		const input = args.input?.trim();
		const city = args.city?.trim();

		if (!input || input.length < 3) return { suggestions: [] };

		const apiKey = env.GOOGLE_MAPS_API_KEY;
		if (!apiKey) throw error(500, 'Google Maps API key not configured');

		// Monthly Places API budget check
		const budget = await checkPlacesBudget();
		if (!budget.allowed) return { suggestions: [], error: 'budget' };

		try {
			// Always send the full input to Google — let the API handle city+street
			// resolution rather than stripping city tokens ourselves. Use locationBias
			// to prefer results near the city when provided.
			const body: Record<string, unknown> = {
				input,
				languageCode: 'pl',
				includedRegionCodes: ['pl']
			};

			if (city) {
				// City-scoped: bias toward city center (real city center from the cities
				// table, falling back to school-average coords).
				const cityCenterCoords = await getCityCenterCoords();
				const center = cityCenterCoords[city] ?? (await getCityCoords())[city];
				if (center) {
					body.locationBias = {
						circle: {
							center: { latitude: center.lat, longitude: center.lng },
							radius: 15000.0
						}
					};
					body.origin = { latitude: center.lat, longitude: center.lng };
				}
				// Addresses/geocoded results only — excludes establishments.
				body.includedPrimaryTypes = ['address', 'geocode', 'route', 'street_address'];
			} else if (args.lat != null && args.lng != null) {
				body.locationBias = {
					circle: {
						center: { latitude: args.lat, longitude: args.lng },
						radius: 50000.0
					}
				};
			}

			if (args.sessionToken) body.sessionToken = args.sessionToken;

			const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Goog-Api-Key': apiKey
				},
				body: JSON.stringify(body)
			});

			if (!res.ok) {
				console.error(`Places API error: ${res.status} ${res.statusText}`);
				return { suggestions: [], error: 'api_error' };
			}
			await recordPlacesCall();

			const data = await res.json();
			// Strip country suffix from descriptions (keep city for context)
			const stripSuffix = (desc: string) =>
				desc
					.split(', ')
					.filter((p) => {
						const lower = p.toLowerCase();
						return lower !== 'polska' && lower !== 'poland';
					})
					.join(', ');

			const suggestions = (data.suggestions ?? [])
				.filter((s: { placePrediction?: unknown }) => s.placePrediction)
				.slice(0, 5)
				.map((s: { placePrediction: { text: { text: string }; placeId: string } }) => ({
					description: stripSuffix(s.placePrediction.text.text),
					placeId: s.placePrediction.placeId
				}));

			return { suggestions };
		} catch (err) {
			console.error('Places autocomplete error:', err);
			return { suggestions: [], error: 'api_error' };
		}
	}
);
