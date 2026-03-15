import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getCityCoords, checkPlacesBudget, recordPlacesCall } from '$lib/server/db/queries/index';

export async function GET({ url }) {
  const input = url.searchParams.get('input')?.trim();
  const city = url.searchParams.get('city')?.trim();
  const sessionToken = url.searchParams.get('sessionToken')?.trim();

  if (!input || input.length < 3) return json([]);

  const apiKey = env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw error(500, 'Google Maps API key not configured');

  // Monthly Places API budget check
  const budget = await checkPlacesBudget();
  if (!budget.allowed) return json([]);

  try {
    // Always send the full input to Google — let the API handle city+street
    // resolution rather than stripping city tokens ourselves. Use locationBias
    // to prefer results near the city when provided.
    const body: Record<string, unknown> = {
      input,
      languageCode: 'pl',
      includedRegionCodes: ['pl'],
    };

    if (city) {
      // City-scoped mode: bias toward city center (not restrict — allows
      // nearby results and avoids dropping valid streets at city edges)
      const cityCoords = await getCityCoords();
      const center = cityCoords[city];
      if (center) {
        body.locationBias = {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: 15000.0,
          },
        };
      }
    } else {
      // Homepage mode: Poland center, 500km radius
      body.locationBias = {
        circle: {
          center: { latitude: 51.9194, longitude: 19.1451 },
          radius: 500000.0,
        },
      };
    }

    if (sessionToken) {
      body.sessionToken = sessionToken;
    }

    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) return json([]);
    await recordPlacesCall();

    const data = await res.json();
    // Strip country suffix from descriptions (keep city for context)
    const stripSuffix = (desc: string) => {
      const parts = desc.split(', ');
      const cleaned = parts.filter(p => {
        const lower = p.toLowerCase();
        return lower !== 'polska' && lower !== 'poland';
      });
      return cleaned.join(', ');
    };

    const suggestions = (data.suggestions ?? [])
      .filter((s: { placePrediction?: unknown }) => s.placePrediction)
      .slice(0, 5)
      .map((s: { placePrediction: { text: { text: string }; placeId: string } }) => ({
        description: stripSuffix(s.placePrediction.text.text),
        placeId: s.placePrediction.placeId,
      }));

    return json(suggestions);
  } catch {
    return json([]);
  }
}
