import { db } from '../index';
import { schools, styles, geocodedStreets } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

let _citiesCache: string[] | null = null;
let _citiesCacheTs = 0;
const CITIES_CACHE_TTL = 10 * 60 * 1000;

export async function getUniqueCities(): Promise<string[]> {
  if (_citiesCache && Date.now() - _citiesCacheTs < CITIES_CACHE_TTL) return _citiesCache;
  const rows = await db
    .selectDistinct({ city: schools.city })
    .from(schools)
    .where(and(sql`${schools.city} != ''`, eq(schools.isListed, true)));
  _citiesCache = rows.map((r) => r.city).sort();
  _citiesCacheTs = Date.now();
  return _citiesCache;
}

let _stylesCache: string[] | null = null;
let _stylesCacheTs = 0;
const STYLES_CACHE_TTL = 10 * 60 * 1000;

export async function getUniqueStyles(): Promise<string[]> {
  if (_stylesCache && Date.now() - _stylesCacheTs < STYLES_CACHE_TTL) return _stylesCache;
  const rows = await db.select({ name: styles.name }).from(styles);
  _stylesCache = rows.map((r) => r.name).sort();
  _stylesCacheTs = Date.now();
  return _stylesCache;
}

export async function getCityCoords(): Promise<Record<string, { lat: number; lng: number }>> {
  const rows = await db
    .select({
      city: schools.city,
      lat: sql<number>`avg(${schools.latitude})`,
      lng: sql<number>`avg(${schools.longitude})`,
    })
    .from(schools)
    .where(and(sql`${schools.latitude} IS NOT NULL AND ${schools.city} != ''`, eq(schools.isListed, true)))
    .groupBy(schools.city);

  const result: Record<string, { lat: number; lng: number }> = {};
  for (const r of rows) {
    if (r.lat != null && r.lng != null) {
      result[r.city] = { lat: r.lat, lng: r.lng };
    }
  }
  return result;
}

export async function getGeocodedStreet(
  city: string,
  street: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const [row] = await db
    .select({ latitude: geocodedStreets.latitude, longitude: geocodedStreets.longitude })
    .from(geocodedStreets)
    .where(
      and(
        sql`lower(${geocodedStreets.city}) = lower(${city})`,
        sql`lower(${geocodedStreets.street}) = lower(${street})`,
      ),
    )
    .limit(1);

  if (!row || row.latitude == null || row.longitude == null) return null;
  return { latitude: row.latitude, longitude: row.longitude };
}

export async function upsertGeocodedStreet(
  city: string,
  street: string,
  latitude: number | null,
  longitude: number | null,
): Promise<void> {
  await db
    .insert(geocodedStreets)
    .values({ city, street, latitude, longitude })
    .onConflictDoUpdate({
      target: [geocodedStreets.city, geocodedStreets.street],
      set: { latitude, longitude },
    });
}

export async function getGeocodedByPlaceId(
  placeId: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const [row] = await db
    .select({ latitude: geocodedStreets.latitude, longitude: geocodedStreets.longitude })
    .from(geocodedStreets)
    .where(eq(geocodedStreets.placeId, placeId))
    .limit(1);

  if (!row || row.latitude == null || row.longitude == null) return null;
  return { latitude: row.latitude, longitude: row.longitude };
}

export async function upsertGeocodedByPlaceId(
  placeId: string,
  city: string,
  street: string,
  latitude: number | null,
  longitude: number | null,
): Promise<void> {
  // Check if this placeId already exists
  const [existing] = await db
    .select({ latitude: geocodedStreets.latitude, longitude: geocodedStreets.longitude })
    .from(geocodedStreets)
    .where(eq(geocodedStreets.placeId, placeId))
    .limit(1);
  if (existing) return;

  // Insert with a unique street key to avoid (city, street) conflict
  // Use placeId as street suffix to guarantee uniqueness
  const streetKey = `${street} [${placeId.slice(-8)}]`;
  await db
    .insert(geocodedStreets)
    .values({ city, street: streetKey, placeId, latitude, longitude, source: 'google' })
    .onConflictDoNothing();
}
