import { db } from "../index";
import { schools, styles, schoolStyles, scheduleEntries } from "../schema";
import { eq, and, or, sql } from "drizzle-orm";
import type {
  Listing,
  ScheduleEntryData,
  AutocompleteEntry,
  ListingCard,
} from "./types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapScheduleRow(
  row: typeof scheduleEntries.$inferSelect,
): ScheduleEntryData {
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
    slug: school.slug,
    name: school.name,
    city: school.city,
    citySlug: school.citySlug ?? "",
    address: school.address ?? "",
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
    photoReference: school.photoReference,
    photoAuthor: school.photoAuthor,
    photoAuthorUrl: school.photoAuthorUrl,
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

/** Build a lean card from explicit column selection */
function buildCard(
  row: {
    id: string;
    slug: string | null;
    name: string;
    city: string;
    citySlug: string | null;
    address: string | null;
    neighborhood: string | null;
    latitude: number | null;
    longitude: number | null;
    price: number | null;
    trialPrice: number | null;
  },
  styleNames: string[],
): ListingCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    citySlug: row.citySlug ?? "",
    address: row.address ?? "",
    neighborhood: row.neighborhood,
    latitude: row.latitude,
    longitude: row.longitude,
    styles: styleNames,
    price: row.price,
    trialPrice: row.trialPrice,
  };
}

// ── Public queries ──────────────────────────────────────────────────────────

export async function getAllListings(): Promise<Listing[]> {
  // Run schools + styles queries in parallel (skip schedule entries — not needed for cards)
  const [allSchools, allSchoolStyles] = await Promise.all([
    db.select().from(schools).where(eq(schools.isListed, true)),
    db
      .select({
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

// ── Autocomplete index (cached) ────────────────────────────────────────────

let _autocompleteCache: AutocompleteEntry[] | null = null;
let _autocompleteCacheTs = 0;
const AUTOCOMPLETE_CACHE_TTL = 10 * 60 * 1000;

export async function getAutocompleteIndex(): Promise<AutocompleteEntry[]> {
  if (
    _autocompleteCache &&
    Date.now() - _autocompleteCacheTs < AUTOCOMPLETE_CACHE_TTL
  ) {
    return _autocompleteCache;
  }

  const [rows, allSchoolStyles] = await Promise.all([
    db
      .select({
        id: schools.id,
        slug: schools.slug,
        name: schools.name,
        city: schools.city,
        citySlug: schools.citySlug,
        address: schools.address,
        neighborhood: schools.neighborhood,
      })
      .from(schools)
      .where(eq(schools.isListed, true)),
    db
      .select({
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

  const result = rows.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    city: s.city,
    citySlug: s.citySlug ?? "",
    address: s.address ?? "",
    neighborhood: s.neighborhood,
    styles: stylesBySchool.get(s.id) ?? [],
  }));

  _autocompleteCache = result;
  _autocompleteCacheTs = Date.now();
  return result;
}

export async function getListingById(id: string): Promise<Listing | null> {
  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.id, id))
    .limit(1);
  if (!school) return null;

  const [schoolStyleRows, schedRows] = await Promise.all([
    db
      .select({ name: styles.name })
      .from(schoolStyles)
      .innerJoin(styles, eq(schoolStyles.styleId, styles.id))
      .where(eq(schoolStyles.schoolId, id)),
    db.select().from(scheduleEntries).where(eq(scheduleEntries.schoolId, id)),
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

export async function getListingByIdentifier(
  identifier: string,
): Promise<Listing | null> {
  const [school] = await db
    .select()
    .from(schools)
    .where(or(eq(schools.id, identifier), eq(schools.slug, identifier)))
    .limit(1);

  if (!school) return null;

  const [schoolStyleRows, schedRows] = await Promise.all([
    db
      .select({ name: styles.name })
      .from(schoolStyles)
      .innerJoin(styles, eq(schoolStyles.styleId, styles.id))
      .where(eq(schoolStyles.schoolId, school.id)),
    db
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.schoolId, school.id)),
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

const _listingsByCityCache = new Map<
  string,
  { data: ListingCard[]; ts: number }
>();
const _listingsByStyleCache = new Map<
  string,
  { data: ListingCard[]; ts: number }
>();
const LISTINGS_CACHE_TTL = 10 * 60 * 1000;

export async function getListingsByStyle(
  styleName: string,
  styleSlug?: string,
): Promise<ListingCard[]> {
  const key = (styleSlug ?? styleName).toLowerCase();
  const cached = _listingsByStyleCache.get(key);
  if (cached && Date.now() - cached.ts < LISTINGS_CACHE_TTL) return cached.data;

  // Try slug first (reliable), then fall back to name match
  let matchedStyles = styleSlug
    ? await db
        .select({ id: styles.id })
        .from(styles)
        .where(sql`${styles.slug} = ${styleSlug}`)
    : [];

  if (matchedStyles.length === 0) {
    matchedStyles = await db
      .select({ id: styles.id })
      .from(styles)
      .where(sql`lower(${styles.name}) = lower(${styleName})`);
  }

  if (matchedStyles.length === 0) return [];

  const schoolIds = await db
    .select({ schoolId: schoolStyles.schoolId })
    .from(schoolStyles)
    .where(
      sql`${schoolStyles.styleId} IN (${sql.join(
        matchedStyles.map((s) => sql`${s.id}`),
        sql`, `,
      )})`,
    );

  if (schoolIds.length === 0) return [];

  const ids = schoolIds.map((r) => r.schoolId);
  const idsSql = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );

  const [matchedSchools, allSchoolStyles] = await Promise.all([
    db
      .select({
        id: schools.id,
        slug: schools.slug,
        name: schools.name,
        city: schools.city,
        citySlug: schools.citySlug,
        address: schools.address,
        neighborhood: schools.neighborhood,
        latitude: schools.latitude,
        longitude: schools.longitude,
        price: schools.price,
        trialPrice: schools.trialPrice,
      })
      .from(schools)
      .where(
        and(sql`${schools.id} IN (${idsSql})`, eq(schools.isListed, true)),
      ),
    db
      .select({ schoolId: schoolStyles.schoolId, styleName: styles.name })
      .from(schoolStyles)
      .innerJoin(styles, eq(schoolStyles.styleId, styles.id))
      .where(sql`${schoolStyles.schoolId} IN (${idsSql})`),
  ]);

  const stylesBySchool = new Map<string, string[]>();
  for (const row of allSchoolStyles) {
    const arr = stylesBySchool.get(row.schoolId) ?? [];
    arr.push(row.styleName);
    stylesBySchool.set(row.schoolId, arr);
  }

  const result = matchedSchools.map((s) =>
    buildCard(s, stylesBySchool.get(s.id) ?? []),
  );
  _listingsByStyleCache.set(key, { data: result, ts: Date.now() });
  return result;
}

export async function getListingsByCity(city: string): Promise<ListingCard[]> {
  const key = city.toLowerCase();
  const cached = _listingsByCityCache.get(key);
  if (cached && Date.now() - cached.ts < LISTINGS_CACHE_TTL) return cached.data;

  const matchedSchools = await db
    .select({
      id: schools.id,
      slug: schools.slug,
      name: schools.name,
      city: schools.city,
      citySlug: schools.citySlug,
      address: schools.address,
      neighborhood: schools.neighborhood,
      latitude: schools.latitude,
      longitude: schools.longitude,
      price: schools.price,
      trialPrice: schools.trialPrice,
    })
    .from(schools)
    .where(
      and(
        sql`lower(${schools.city}) = lower(${city})`,
        eq(schools.isListed, true),
      ),
    );

  if (matchedSchools.length === 0) return [];

  const ids = matchedSchools.map((s) => s.id);
  const idsSql = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );

  const allSchoolStyles = await db
    .select({ schoolId: schoolStyles.schoolId, styleName: styles.name })
    .from(schoolStyles)
    .innerJoin(styles, eq(schoolStyles.styleId, styles.id))
    .where(sql`${schoolStyles.schoolId} IN (${idsSql})`);

  const stylesBySchool = new Map<string, string[]>();
  for (const row of allSchoolStyles) {
    const arr = stylesBySchool.get(row.schoolId) ?? [];
    arr.push(row.styleName);
    stylesBySchool.set(row.schoolId, arr);
  }

  const result = matchedSchools.map((s) =>
    buildCard(s, stylesBySchool.get(s.id) ?? []),
  );
  _listingsByCityCache.set(key, { data: result, ts: Date.now() });
  return result;
}
