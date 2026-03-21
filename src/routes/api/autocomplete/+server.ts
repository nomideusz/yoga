import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getCityCenterCoords, getCityCoords, checkPlacesBudget, recordPlacesCall } from '$lib/server/db/queries/index';

/** Response shape: { suggestions: [...], error?: 'budget' | 'api_error' } */
export async function GET({ url }) {
  const input = url.searchParams.get('input')?.trim();
  const city = url.searchParams.get('city')?.trim();
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const sessionToken = url.searchParams.get('sessionToken')?.trim();

  if (!input || input.length < 3) return json({ suggestions: [] });

  const apiKey = env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw error(500, 'Google Maps API key not configured');

  // Monthly Places API budget check
  const budget = await checkPlacesBudget();
  if (!budget.allowed) return json({ suggestions: [], error: 'budget' });

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
      // nearby results and avoids dropping valid streets at city edges).
      // Prefer cities table coords (real city center) over school-average coords.
      const cityCenterCoords = await getCityCenterCoords();
      const center = cityCenterCoords[city] ?? (await getCityCoords())[city];
      if (center) {
        body.locationBias = {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: 15000.0,
          },
        };
        // Set origin so Google ranks results by distance from city center
        body.origin = { latitude: center.lat, longitude: center.lng };
      }
      // Filter to addresses and geocoded results only — excludes hospitals,
      // restaurants, and other irrelevant establishment types. The user is
      // searching for a yoga school's street address, not a business name.
      body.includedPrimaryTypes = ['address', 'geocode', 'route', 'street_address'];
    } else if (lat && lng) {
      // User location available — bias around their position
      body.locationBias = {
        circle: {
          center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
          radius: 50000.0,
        },
      };
    }
    // No bias when neither city nor user location is known —
    // includedRegionCodes: ['pl'] is enough. A 500km circle around
    // Poland's center was too vague and caused Google to return empty
    // for street names like "bydgoskiej".

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

    if (!res.ok) {
      console.error(`Places API error: ${res.status} ${res.statusText}`);
      return json({ suggestions: [], error: 'api_error' });
    }
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

    return json({ suggestions });
  } catch (err) {
    console.error('Places autocomplete error:', err);
    return json({ suggestions: [], error: 'api_error' });
  }
}
