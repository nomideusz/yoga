import { eq, sql, asc } from 'drizzle-orm';
import { db } from './index';
import { schools, styles, schoolStyles, scheduleEntries } from './schema';

// ── Types matching the frontend Listing interface ───────────────────────────

export interface Listing {
  id: string;
  name: string;
  city: string;
  address: string;
  websiteUrl: string;
  phone: string | null;
  email: string | null;
  price: number | null;
  trialPrice: number | null;
  singleClassPrice: number | null;
  pricingNotes: string | null;
  rating: number | null;
  reviews: number | null;
  styles: string[];
  descriptionRaw: string;
  description: string;
  schedule: ScheduleEntryData[];
  imageUrl: string;
  googlePlaceId: string;
  googleMapsUrl: string;
  lastPriceCheck: string | null;
  lastUpdated: string;
  source: string;
}

export interface ScheduleEntryData {
  day: string;
  time: string;
  class_name: string;
  instructor?: string | null;
  level?: string | null;
}

// ── Hydrate a school row + relations into a Listing ─────────────────────────

async function hydrateListing(school: typeof schools.$inferSelect): Promise<Listing> {
  // Fetch styles
  const schoolStyleRows = await db
    .select({ name: styles.name })
    .from(schoolStyles)
    .innerJoin(styles, eq(schoolStyles.styleId, styles.id))
    .where(eq(schoolStyles.schoolId, school.id));

  // Fetch schedule
  const scheduleRows = await db
    .select()
    .from(scheduleEntries)
    .where(eq(scheduleEntries.schoolId, school.id));

  return {
    id: school.id,
    name: school.name,
    city: school.city,
    address: school.address,
    websiteUrl: school.websiteUrl ?? '',
    phone: school.phone,
    email: school.email,
    price: school.price,
    trialPrice: school.trialPrice,
    singleClassPrice: school.singleClassPrice,
    pricingNotes: school.pricingNotes,
    rating: school.rating,
    reviews: school.reviews,
    styles: schoolStyleRows.map(r => r.name),
    descriptionRaw: school.descriptionRaw ?? '',
    description: school.description ?? '',
    schedule: scheduleRows.map(r => ({
      day: r.day,
      time: r.time,
      class_name: r.className,
      instructor: r.instructor,
      level: r.level,
    })),
    imageUrl: school.imageUrl ?? '',
    googlePlaceId: school.googlePlaceId ?? '',
    googleMapsUrl: school.googleMapsUrl ?? '',
    lastPriceCheck: school.lastPriceCheck,
    lastUpdated: school.lastUpdated ?? '',
    source: school.source ?? 'manual',
  };
}

// ── Query functions ─────────────────────────────────────────────────────────

export async function getAllListings(): Promise<Listing[]> {
  const rows = await db.select().from(schools).orderBy(asc(schools.city), asc(schools.name));
  return Promise.all(rows.map(hydrateListing));
}

export async function getListingById(id: string): Promise<Listing | null> {
  const rows = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
  if (rows.length === 0) return null;
  return hydrateListing(rows[0]);
}

export async function getListingsByCity(city: string): Promise<Listing[]> {
  const rows = await db
    .select()
    .from(schools)
    .where(sql`LOWER(${schools.city}) = LOWER(${city})`)
    .orderBy(asc(schools.name));
  return Promise.all(rows.map(hydrateListing));
}

export async function getUniqueCities(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ city: schools.city })
    .from(schools)
    .orderBy(asc(schools.city));
  return rows.map(r => r.city);
}

export async function getUniqueStyles(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: styles.name })
    .from(styles)
    .orderBy(asc(styles.name));
  return rows.map(r => r.name);
}

export type CityCoord = { city: string; lat: number; lng: number };

export async function getCityCoords(): Promise<CityCoord[]> {
  const rows = await db
    .select({
      city: schools.city,
      lat: sql<number>`AVG(${schools.latitude})`,
      lng: sql<number>`AVG(${schools.longitude})`,
    })
    .from(schools)
    .where(sql`${schools.latitude} IS NOT NULL AND ${schools.longitude} IS NOT NULL`)
    .groupBy(schools.city)
    .orderBy(asc(schools.city));

  return rows.filter(r => r.lat != null && r.lng != null) as CityCoord[];
}

export async function getListingsByStyle(styleName: string): Promise<Listing[]> {
  const styleRow = await db
    .select()
    .from(styles)
    .where(sql`LOWER(${styles.name}) = LOWER(${styleName})`)
    .limit(1);

  if (styleRow.length === 0) return [];

  const schoolIds = await db
    .select({ schoolId: schoolStyles.schoolId })
    .from(schoolStyles)
    .where(eq(schoolStyles.styleId, styleRow[0].id));

  if (schoolIds.length === 0) return [];

  const ids = schoolIds.map(r => r.schoolId);
  const rows = await db
    .select()
    .from(schools)
    .where(sql`${schools.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(asc(schools.name));

  return Promise.all(rows.map(hydrateListing));
}
