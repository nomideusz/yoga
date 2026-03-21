import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import {
  getGeocodedStreet,
  upsertGeocodedStreet,
  getGeocodedByPlaceId,
  upsertGeocodedByPlaceId,
} from '$lib/server/db/queries/index';
import { db } from '$lib/server/db/index';
import { cities } from '$lib/server/db/schema';

/** Find the nearest city from our cities table using Haversine */
async function nearestCity(lat: number, lng: number): Promise<{ name: string; slug: string; distKm: number } | null> {
  const allCities = await db.select({ name: cities.name, slug: cities.slug, lat: cities.lat, lng: cities.lng }).from(cities);
  let best: { name: string; slug: string; distKm: number } | null = null;
  let bestDist = Infinity;
  const R = 6371;
  for (const c of allCities) {
    const dlat = (c.lat - lat) * Math.PI / 180;
    const dlng = (c.lng - lng) * Math.PI / 180;
    const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(c.lat * Math.PI / 180) * Math.sin(dlng / 2) ** 2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (d < bestDist) { bestDist = d; best = { name: c.name, slug: c.slug, distKm: d }; }
  }
  return best;
}

export async function GET({ url }) {
  const placeId = url.searchParams.get('placeId')?.trim();
  const street = url.searchParams.get('street')?.trim();
  const city = url.searchParams.get('city')?.trim();

  const apiKey = env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw error(500, 'Google Maps API key not configured');

  // ── IP-based geolocation fallback (when browser geolocation fails) ──
  const ipGeo = url.searchParams.get('ipGeo')?.trim();
  if (ipGeo === '1') {
    const geoKey = publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY || apiKey;
    try {
      const res = await fetch(
        `https://www.googleapis.com/geolocation/v1/geolocate?key=${geoKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"considerIp": true}' }
      );
      const data = await res.json();
      if (data?.location) {
        return json({ latitude: data.location.lat, longitude: data.location.lng, accuracy: data.accuracy });
      }
      return json(null);
    } catch {
      return json(null);
    }
  }

  // ── Nearest city from our DB (no Google API call) ──
  const ncLat = url.searchParams.get('ncLat')?.trim();
  const ncLng = url.searchParams.get('ncLng')?.trim();
  if (ncLat && ncLng) {
    const lat = parseFloat(ncLat);
    const lng = parseFloat(ncLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      const city = await nearestCity(lat, lng);
      return json({ cityName: city?.name ?? null, citySlug: city?.slug ?? null, distanceKm: city?.distKm ?? null });
    }
    return json({ cityName: null, citySlug: null });
  }

  // ── Reverse geocode (lat/lng → readable name) ──
  const revLat = url.searchParams.get('revLat')?.trim();
  const revLng = url.searchParams.get('revLng')?.trim();
  if (revLat && revLng) {
    try {
      const lat = parseFloat(revLat);
      const lng = parseFloat(revLng);
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${revLat},${revLng}&key=${apiKey}&language=pl&result_type=neighborhood|sublocality|route`
      );
      const data = await res.json();
      let name: string | null = null;
      if (data.status === 'OK' && data.results?.[0]) {
        const components = data.results[0].address_components ?? [];
        const neighborhood = components.find((c: { types: string[] }) =>
          c.types.includes('neighborhood') || c.types.includes('sublocality')
        );
        const route = components.find((c: { types: string[] }) =>
          c.types.includes('route')
        );
        name = neighborhood?.long_name || route?.long_name || null;
      }
      // Fallback to nearest city from our DB
      if (!name && !isNaN(lat) && !isNaN(lng)) {
        const city = await nearestCity(lat, lng);
        name = city?.name ?? null;
      }
      return json({ locationName: name });
    } catch {
      return json({ locationName: null });
    }
  }

  // ── PlaceId lookup (from autocomplete) ──
  if (placeId) {
    const cached = await getGeocodedByPlaceId(placeId);
    if (cached) return json(cached);

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`
      );
      const data = await res.json();

      if (data.status === 'OK' && data.results?.[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        const addr = data.results[0].formatted_address ?? '';
        await upsertGeocodedByPlaceId(placeId, city ?? '', addr, lat, lng);
        return json({ latitude: lat, longitude: lng });
      }

      return json(null);
    } catch {
      return json(null);
    }
  }

  // ── Postal code lookup (APPROXIMATE is expected and acceptable) ──
  const postalCode = url.searchParams.get('postalCode')?.trim();
  if (postalCode) {
    const cached = await getGeocodedStreet('PL', postalCode);
    if (cached && cached.latitude != null && cached.longitude != null) {
      const city = await nearestCity(cached.latitude, cached.longitude);
      return json({ ...cached, locationName: city?.name ?? null, locationSlug: city?.slug ?? null });
    }

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(postalCode + ', Poland')}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.status === 'OK' && data.results?.[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        await upsertGeocodedStreet('PL', postalCode, lat, lng);
        const city = await nearestCity(lat, lng);
        return json({ latitude: lat, longitude: lng, locationName: city?.name ?? null, locationSlug: city?.slug ?? null });
      }
      await upsertGeocodedStreet('PL', postalCode, null, null);
      return json(null);
    } catch {
      return json(null);
    }
  }

  // ── Street + city lookup ──
  if (!street || !city) {
    throw error(400, 'Missing street or city parameter');
  }

  const cached = await getGeocodedStreet(city, street);
  if (cached) return json(cached);

  try {
    const address = `${street}, ${city}, Poland`;
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    const data = await res.json();

    if (data.status === 'OK' && data.results?.[0]) {
      const result = data.results[0];
      const locationType = result.geometry?.location_type;
      // Reject vague matches (APPROXIMATE = city-level, GEOMETRIC_CENTER = area centroid)
      if (locationType === 'APPROXIMATE') {
        await upsertGeocodedStreet(city, street, null, null);
        return json(null);
      }
      const { lat, lng } = result.geometry.location;
      await upsertGeocodedStreet(city, street, lat, lng);
      return json({ latitude: lat, longitude: lng });
    }

    await upsertGeocodedStreet(city, street, null, null);
    return json(null);
  } catch {
    return json(null);
  }
}
