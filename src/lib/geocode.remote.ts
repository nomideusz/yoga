import { command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import {
	getGeocodedStreet,
	upsertGeocodedStreet,
	getGeocodedByPlaceId,
	upsertGeocodedByPlaceId
} from '$lib/server/db/queries/index';
import { db } from '$lib/server/db/index';
import { cities } from '$lib/server/db/schema';

// These were the six modes of `GET /api/geocode`, split into one command each.
// They're commands (not queries) because they're invoked imperatively on user
// actions and most write geocoding results back to the cache.

/** Nearest city from our cities table using Haversine. */
async function nearestCityOf(
	lat: number,
	lng: number
): Promise<{ name: string; slug: string; distKm: number } | null> {
	const allCities = await db
		.select({ name: cities.name, slug: cities.slug, lat: cities.lat, lng: cities.lng })
		.from(cities);
	let best: { name: string; slug: string; distKm: number } | null = null;
	let bestDist = Infinity;
	const R = 6371;
	for (const c of allCities) {
		const dlat = ((c.lat - lat) * Math.PI) / 180;
		const dlng = ((c.lng - lng) * Math.PI) / 180;
		const a =
			Math.sin(dlat / 2) ** 2 +
			Math.cos((lat * Math.PI) / 180) * Math.cos((c.lat * Math.PI) / 180) * Math.sin(dlng / 2) ** 2;
		const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		if (d < bestDist) {
			bestDist = d;
			best = { name: c.name, slug: c.slug, distKm: d };
		}
	}
	return best;
}

function requireApiKey(): string {
	const apiKey = env.GOOGLE_MAPS_API_KEY;
	if (!apiKey) throw error(500, 'Google Maps API key not configured');
	return apiKey;
}

function headerNumber(request: Request, name: string): number | null {
	const value = request.headers.get(name);
	if (!value) return null;
	const parsed = parseFloat(value);
	return Number.isFinite(parsed) ? parsed : null;
}

/** IP-based geolocation fallback — `/api/geocode?ipGeo=1`. */
export const ipGeolocate = command(async () => {
	const apiKey = requireApiKey();
	const { request } = getRequestEvent();

	const vercelLat = headerNumber(request, 'x-vercel-ip-latitude');
	const vercelLng = headerNumber(request, 'x-vercel-ip-longitude');
	if (vercelLat != null && vercelLng != null) {
		return {
			latitude: vercelLat,
			longitude: vercelLng,
			accuracy: 50000,
			locationName: request.headers.get('x-vercel-ip-city') ?? null,
			source: 'vercel-ip'
		};
	}

	const geoKey = publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY || apiKey;
	try {
		const res = await fetch(`https://www.googleapis.com/geolocation/v1/geolocate?key=${geoKey}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{"considerIp": true}'
		});
		const data = await res.json();
		if (data?.location) {
			return { latitude: data.location.lat, longitude: data.location.lng, accuracy: data.accuracy };
		}
		return null;
	} catch {
		return null;
	}
});

/** Nearest city from our DB (no Google call) — `/api/geocode?ncLat&ncLng`. */
export const nearestCityFromCoords = command(
	'unchecked',
	async (args: { lat: number; lng: number }) => {
		const city = await nearestCityOf(args.lat, args.lng);
		return {
			cityName: city?.name ?? null,
			citySlug: city?.slug ?? null,
			distanceKm: city?.distKm ?? null
		};
	}
);

/** Reverse geocode (lat/lng → readable name) — `/api/geocode?revLat&revLng`. */
export const reverseGeocode = command('unchecked', async (args: { lat: number; lng: number }) => {
	const apiKey = requireApiKey();
	try {
		const res = await fetch(
			`https://maps.googleapis.com/maps/api/geocode/json?latlng=${args.lat},${args.lng}&key=${apiKey}&language=pl&result_type=neighborhood|sublocality|route`
		);
		const data = await res.json();
		let name: string | null = null;
		if (data.status === 'OK' && data.results?.[0]) {
			const components = data.results[0].address_components ?? [];
			const neighborhood = components.find(
				(c: { types: string[] }) =>
					c.types.includes('neighborhood') || c.types.includes('sublocality')
			);
			const route = components.find((c: { types: string[] }) => c.types.includes('route'));
			name = neighborhood?.long_name || route?.long_name || null;
		}
		// Fallback to nearest city from our DB
		if (!name) {
			const city = await nearestCityOf(args.lat, args.lng);
			name = city?.name ?? null;
		}
		return { locationName: name };
	} catch {
		return { locationName: null };
	}
});

/** PlaceId lookup (from autocomplete) — `/api/geocode?placeId`. */
export const geocodeByPlaceId = command(
	'unchecked',
	async (args: { placeId: string; city?: string }) => {
		const apiKey = requireApiKey();
		const cached = await getGeocodedByPlaceId(args.placeId);
		if (cached) return cached;

		try {
			const res = await fetch(
				`https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(args.placeId)}&key=${apiKey}`
			);
			const data = await res.json();
			if (data.status === 'OK' && data.results?.[0]) {
				const { lat, lng } = data.results[0].geometry.location;
				const addr = data.results[0].formatted_address ?? '';
				await upsertGeocodedByPlaceId(args.placeId, args.city ?? '', addr, lat, lng);
				return { latitude: lat, longitude: lng };
			}
			return null;
		} catch {
			return null;
		}
	}
);

/** Postal code lookup (approximate) — `/api/geocode?postalCode`. */
export const geocodeByPostalCode = command('unchecked', async (args: { postalCode: string }) => {
	const apiKey = requireApiKey();
	const cached = await getGeocodedStreet('PL', args.postalCode);
	if (cached && cached.latitude != null && cached.longitude != null) {
		const city = await nearestCityOf(cached.latitude, cached.longitude);
		return { ...cached, locationName: city?.name ?? null, locationSlug: city?.slug ?? null };
	}

	try {
		const res = await fetch(
			`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(args.postalCode + ', Poland')}&key=${apiKey}`
		);
		const data = await res.json();
		if (data.status === 'OK' && data.results?.[0]) {
			const { lat, lng } = data.results[0].geometry.location;
			await upsertGeocodedStreet('PL', args.postalCode, lat, lng);
			const city = await nearestCityOf(lat, lng);
			return {
				latitude: lat,
				longitude: lng,
				locationName: city?.name ?? null,
				locationSlug: city?.slug ?? null
			};
		}
		await upsertGeocodedStreet('PL', args.postalCode, null, null);
		return null;
	} catch {
		return null;
	}
});

/** Street + city lookup — `/api/geocode?street&city`. */
export const geocodeByStreet = command(
	'unchecked',
	async (args: { street: string; city: string }) => {
		const apiKey = requireApiKey();
		if (!args.street || !args.city) throw error(400, 'Missing street or city parameter');

		const cached = await getGeocodedStreet(args.city, args.street);
		if (cached) return cached;

		try {
			const address = `${args.street}, ${args.city}, Poland`;
			const res = await fetch(
				`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
			);
			const data = await res.json();
			if (data.status === 'OK' && data.results?.[0]) {
				const result = data.results[0];
				const locationType = result.geometry?.location_type;
				// Reject vague matches (APPROXIMATE = city-level)
				if (locationType === 'APPROXIMATE') {
					await upsertGeocodedStreet(args.city, args.street, null, null);
					return null;
				}
				const { lat, lng } = result.geometry.location;
				await upsertGeocodedStreet(args.city, args.street, lat, lng);
				return { latitude: lat, longitude: lng };
			}
			await upsertGeocodedStreet(args.city, args.street, null, null);
			return null;
		} catch {
			return null;
		}
	}
);
