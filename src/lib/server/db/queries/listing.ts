import { db } from '../index';
import { schools, styles, schoolStyles, scheduleEntries } from '../schema';
import { eq, and, sql } from 'drizzle-orm';
import type { Listing, ScheduleEntryData } from './types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapScheduleRow(row: typeof scheduleEntries.$inferSelect): ScheduleEntryData {
  return {
    id: row.id,
    schoolId: row.schoolId,
    scheduleType: row.scheduleType,
    dayOfWeek: row.dayOfWeek,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    duration: row.duration,
    className: row.className,
    classDescription: row.classDescription,
    teacher: row.teacher,
    level: row.level,
    style: row.style,
    location: row.location,
    totalCapacity: row.totalCapacity,
    spotsLeft: row.spotsLeft,
    waitingListCapacity: row.waitingListCapacity,
    isCancelled: row.isCancelled ?? false,
    isFree: row.isFree ?? false,
    isBookableOnline: row.isBookableOnline ?? true,
    source: row.source,
    externalId: row.externalId,
    bookingUrl: row.bookingUrl,
    metadata: row.metadata,
    lastSeenAt: row.lastSeenAt,
    createdAt: row.createdAt,
  };
}

function buildListing(
  school: typeof schools.$inferSelect,
  styleNames: string[],
  schedule: ScheduleEntryData[],
): Listing {
  return {
    id: school.id,
    name: school.name,
    city: school.city,
    address: school.address ?? '',
    websiteUrl: school.websiteUrl,
    phone: school.phone,
    email: school.email,
    price: school.price,
    priceEstimated: school.priceEstimated ?? false,
    trialPrice: school.trialPrice,
    singleClassPrice: school.singleClassPrice,
    pricingNotes: school.pricingNotes,
    pricingUrl: school.pricingUrl,
    healthStatus: school.healthStatus,
    rating: school.rating,
    reviews: school.reviews,
    description: school.description,
    editorialSummary: school.editorialSummary,
    openingHours: school.openingHours,
    imageUrl: school.imageUrl,
    neighborhood: school.neighborhood,
    latitude: school.latitude,
    longitude: school.longitude,
    googleMapsUrl: school.googleMapsUrl,
    scheduleUrl: school.scheduleUrl,
    scheduleSource: school.scheduleSource,
    lastPriceCheck: school.lastPriceCheck,
    lastUpdated: school.lastUpdated,
    source: school.source,
    styles: styleNames,
    schedule,
  };
}

// ── Public queries ──────────────────────────────────────────────────────────

export async function getAllListings(): Promise<Listing[]> {
  // Run schools + styles queries in parallel (skip schedule entries — not needed for cards)
  const [allSchools, allSchoolStyles] = await Promise.all([
    db.select().from(schools).where(eq(schools.isListed, true)),
    db.select({
      schoolId: schoolStyles.schoolId,
      styleName: styles.name,
    })
    .from(schoolStyles)
    .innerJoin(styles, eq(schoolStyles.styleId, styles.id)),
  ]);

  const stylesBySchool = new Map<string, string[]>();
  for (const row of allSchoolStyles) {
    const arr = stylesBySchool.get(row.schoolId) ?? [];
    arr.push(row.styleName);
    stylesBySchool.set(row.schoolId, arr);
  }

  return allSchools.map((s) =>
    buildListing(s, stylesBySchool.get(s.id) ?? [], []),
  );
}

export async function getListingById(id: string): Promise<Listing | null> {
  const [school] = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
  if (!school) return null;

  const [schoolStyleRows, schedRows] = await Promise.all([
    db.select({ name: styles.name })
      .from(schoolStyles)
      .innerJoin(styles, eq(schoolStyles.styleId, styles.id))
      .where(eq(schoolStyles.schoolId, id)),
    db.select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.schoolId, id)),
  ]);

  return {
    ...buildListing(
      school,
      schoolStyleRows.map((r) => r.name),
      schedRows.map(mapScheduleRow),
    ),
    pricingJson: school.pricingJson,
    descriptionRaw: school.descriptionRaw,
  };
}

export async function getListingsByStyle(styleName: string): Promise<Listing[]> {
  // Find matching style IDs (case-insensitive)
  const matchedStyles = await db
    .select({ id: styles.id })
    .from(styles)
    .where(sql`lower(${styles.name}) = lower(${styleName})`);

  if (matchedStyles.length === 0) return [];

  // Get school IDs that have this style
  const schoolIds = await db
    .select({ schoolId: schoolStyles.schoolId })
    .from(schoolStyles)
    .where(
      sql`${schoolStyles.styleId} IN (${sql.join(matchedStyles.map((s) => sql`${s.id}`), sql`, `)})`
    );

  if (schoolIds.length === 0) return [];

  const ids = schoolIds.map((r) => r.schoolId);

  const idsSql = sql.join(ids.map((id) => sql`${id}`), sql`, `);

  // Fetch schools + styles + schedule entries in parallel
  const [matchedSchools, allSchoolStyles, entries] = await Promise.all([
    db.select()
      .from(schools)
      .where(and(sql`${schools.id} IN (${idsSql})`, eq(schools.isListed, true))),
    db.select({ schoolId: schoolStyles.schoolId, styleName: styles.name })
      .from(schoolStyles)
      .innerJoin(styles, eq(schoolStyles.styleId, styles.id))
      .where(sql`${schoolStyles.schoolId} IN (${idsSql})`),
    db.select()
      .from(scheduleEntries)
      .where(sql`${scheduleEntries.schoolId} IN (${idsSql})`),
  ]);

  const stylesBySchool = new Map<string, string[]>();
  for (const row of allSchoolStyles) {
    const arr = stylesBySchool.get(row.schoolId) ?? [];
    arr.push(row.styleName);
    stylesBySchool.set(row.schoolId, arr);
  }

  const schedBySchool = new Map<string, ScheduleEntryData[]>();
  for (const row of entries) {
    const arr = schedBySchool.get(row.schoolId) ?? [];
    arr.push(mapScheduleRow(row));
    schedBySchool.set(row.schoolId, arr);
  }

  return matchedSchools.map((s) =>
    buildListing(s, stylesBySchool.get(s.id) ?? [], schedBySchool.get(s.id) ?? []),
  );
}

export async function getListingsByCity(city: string): Promise<Listing[]> {
  const matchedSchools = await db
    .select()
    .from(schools)
    .where(and(sql`lower(${schools.city}) = lower(${city})`, eq(schools.isListed, true)));

  if (matchedSchools.length === 0) return [];

  const ids = matchedSchools.map((s) => s.id);
  const idsSql = sql.join(ids.map((id) => sql`${id}`), sql`, `);

  // Batch-load styles + schedule entries in parallel
  const [allSchoolStyles, entries] = await Promise.all([
    db.select({ schoolId: schoolStyles.schoolId, styleName: styles.name })
      .from(schoolStyles)
      .innerJoin(styles, eq(schoolStyles.styleId, styles.id))
      .where(sql`${schoolStyles.schoolId} IN (${idsSql})`),
    db.select()
      .from(scheduleEntries)
      .where(sql`${scheduleEntries.schoolId} IN (${idsSql})`),
  ]);

  const stylesBySchool = new Map<string, string[]>();
  for (const row of allSchoolStyles) {
    const arr = stylesBySchool.get(row.schoolId) ?? [];
    arr.push(row.styleName);
    stylesBySchool.set(row.schoolId, arr);
  }

  const schedBySchool = new Map<string, ScheduleEntryData[]>();
  for (const row of entries) {
    const arr = schedBySchool.get(row.schoolId) ?? [];
    arr.push(mapScheduleRow(row));
    schedBySchool.set(row.schoolId, arr);
  }

  return matchedSchools.map((s) =>
    buildListing(s, stylesBySchool.get(s.id) ?? [], schedBySchool.get(s.id) ?? []),
  );
}
