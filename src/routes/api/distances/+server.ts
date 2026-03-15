import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getCachedDistances, cacheDistances } from '$lib/server/db/queries/index';
import { db } from '$lib/server/db';
import { schools } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';

// Daily budget cap for Routes API calls (resets each day, in-memory)
const DAILY_LIMIT = 100; // ~100 matrix calls/day ≈ $5/day max
let dailyCalls = 0;
let lastResetDate = new Date().toDateString();

function checkBudget(): boolean {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyCalls = 0;
    lastResetDate = today;
  }
  return dailyCalls < DAILY_LIMIT;
}

export async function POST({ request }) {
  const body = await request.json();
  const { origin, schoolIds } = body as {
    origin: { lat: number; lng: number };
    schoolIds: string[];
  };

  if (origin?.lat == null || origin?.lng == null || !schoolIds?.length) {
    throw error(400, 'Missing origin or schoolIds');
  }

  const apiKey = env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw error(500, 'Google Maps API key not configured');

  // Check cache first
  const cached = await getCachedDistances(origin.lat, origin.lng, schoolIds);
  const uncachedIds = schoolIds.filter(id => !cached.has(id));

  // If all cached, return immediately
  if (uncachedIds.length === 0) {
    const distances: Record<string, { distanceMeters: number; durationMinutes: number }> = {};
    for (const [id, d] of cached) distances[id] = d;
    return json({ distances, budgetExceeded: false });
  }

  // Get lat/lng for uncached schools
  const schoolRows = await db
    .select({ id: schools.id, lat: schools.latitude, lng: schools.longitude })
    .from(schools)
    .where(sql`${schools.id} IN (${sql.join(uncachedIds.map(id => sql`${id}`), sql`, `)})`);

  const destinations = schoolRows.filter(s => s.lat != null && s.lng != null);

  // Call Routes API computeRouteMatrix (if within daily budget)
  let apiResults = new Map<string, { distanceMeters: number; durationMinutes: number }>();
  let budgetExceeded = false;

  if (destinations.length > 0 && checkBudget()) {
    try {
      const routeBody = {
        origins: [{
          waypoint: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        }],
        destinations: destinations.map(d => ({
          waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } },
        })),
        travelMode: 'WALK',
      };

      const res = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration',
        },
        body: JSON.stringify(routeBody),
      });

      if (res.ok) {
        dailyCalls++;
        const elements = await res.json();
        if (Array.isArray(elements)) {
          for (const el of elements) {
            if (el.distanceMeters != null && el.duration != null) {
              const school = destinations[el.destinationIndex];
              if (school) {
                const durationSec = parseInt(el.duration.replace('s', ''), 10);
                apiResults.set(school.id, {
                  distanceMeters: el.distanceMeters,
                  durationMinutes: Math.round(durationSec / 60),
                });
              }
            }
          }
        }
      }
    } catch {
      // Fall through — client falls back to haversine
    }
  } else if (destinations.length > 0) {
    budgetExceeded = true;
  }

  // Cache API results
  if (apiResults.size > 0) {
    const toCache = [...apiResults.entries()].map(([schoolId, d]) => ({
      schoolId,
      ...d,
    }));
    await cacheDistances(origin.lat, origin.lng, toCache);
  }

  // Merge cached + API results
  const distances: Record<string, { distanceMeters: number; durationMinutes: number }> = {};
  for (const [id, d] of cached) distances[id] = d;
  for (const [id, d] of apiResults) distances[id] = d;

  return json({ distances, budgetExceeded });
}
