import { sqliteTable, text, real, integer, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ── Schools (main listing) ──────────────────────────────────────────────────

export const schools = sqliteTable('schools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  address: text('address').notNull().default(''),
  websiteUrl: text('website_url').default(''),
  phone: text('phone'),
  email: text('email'),

  price: real('price'),
  priceEstimated: integer('price_estimated', { mode: 'boolean' }).default(false),
  trialPrice: real('trial_price'),
  singleClassPrice: real('single_class_price'),
  pack4Price: real('pack_4_price'),       // 4-class pack price (comparison point)
  pack8Price: real('pack_8_price'),       // 8-class pack price (comparison point)
  openPrice: real('open_price'),          // unlimited/open monthly price (comparison point)
  pricingNotes: text('pricing_notes'),
  pricingJson: text('pricing_json'),  // full structured pricing (JSON array of tiers + metadata)

  rating: real('rating'),
  reviews: integer('reviews'),

  descriptionRaw: text('description_raw').default(''),
  description: text('description').default(''),
  editorialSummary: text('editorial_summary').default(''),
  openingHours: text('opening_hours').default(''),
  imageUrl: text('image_url').default(''),
  photoReference: text('photo_reference').default(''),

  neighborhood: text('neighborhood').default(''),
  latitude: real('latitude'),
  longitude: real('longitude'),

  googlePlaceId: text('google_place_id').default(''),
  googleMapsUrl: text('google_maps_url').default(''),

  pricingUrl: text('pricing_url').default(''),
  scheduleUrl: text('schedule_url').default(''),
  scheduleSource: text('schedule_source').default(''),
  scheduleMode: text('schedule_mode').default('auto'),  // 'auto' | 'weekly' | 'dated'
  lastScheduleCrawl: text('last_schedule_crawl'),

  healthStatus: text('health_status'),  // 'healthy' | 'dead' | 'redirected' | 'timeout' | 'irrelevant'
  enrichmentStrategy: text('enrichment_strategy'),  // 'fitssey' | 'efitness' | 'rich_text' | 'nlm' | 'vision' | 'social_only' | 'manual'
  lastHealthCheck: text('last_health_check'),  // ISO timestamp

  isListed: integer('is_listed', { mode: 'boolean' }).default(true),

  lastPriceCheck: text('last_price_check'),
  lastUpdated: text('last_updated').default(sql`(CURRENT_DATE)`),
  source: text('source').default('manual'),

  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),

  // ── Search infrastructure (normalized shadow columns) ─────────────────────
  nameN: text('name_n').default(''),
  cityN: text('city_n').default(''),
  citySlug: text('city_slug').default(''),
  streetN: text('street_n').default(''),       // normalized from address
  districtN: text('district_n').default(''),   // normalized from neighborhood
  stylesN: text('styles_n').default(''),       // space-separated normalized style names
  descriptionN: text('description_n').default(''),
  postcode: text('postcode'),                  // extracted or manual "XX-XXX"
  slug: text('slug'),                          // URL-friendly unique slug
});

// ── Styles (many-to-many via junction) ──────────────────────────────────────

export const styles = sqliteTable('styles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug'),                          // "hatha-yoga" — for URL routing
  nameN: text('name_n').default(''),           // normalized: "hatha yoga"
  aliasesN: text('aliases_n').default(''),     // space-separated aliases: "hatha hata hatha joga"
  schoolCount: integer('school_count').default(0),
});

export const schoolStyles = sqliteTable('school_styles', {
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  styleId: integer('style_id').notNull().references(() => styles.id, { onDelete: 'cascade' }),
}, (table) => ({
  unq: unique().on(table.schoolId, table.styleId),
}));

// ── Schedule ────────────────────────────────────────────────────────────────
//
//  `scheduleType` determines how the entry is interpreted:
//    • 'weekly'  → recurring; `dayOfWeek` is set, `date` is null
//    • 'dated'   → one-off / booking; `date` is set (dayOfWeek still filled for convenience)
//
//  The seed script auto-detects which mode to use per school.
//

export const scheduleEntries = sqliteTable('schedule_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),

  // ── When ───────────────────────────────────────────────────
  scheduleType: text('schedule_type').notNull().default('weekly'), // 'weekly' | 'dated'
  dayOfWeek: integer('day_of_week').notNull(),        // 0=Monday … 6=Sunday (ISO)
  date: text('date'),                                 // "2026-03-05" for dated entries, null for weekly
  startTime: text('start_time').notNull(),            // "07:00"  (HH:mm, 24 h)
  endTime: text('end_time'),                          // "08:30"  (nullable – some sources omit it)
  duration: integer('duration'),                      // minutes  (nullable – handy when endTime missing)

  // ── What ───────────────────────────────────────────────────
  className: text('class_name').notNull(),
  classDescription: text('class_description'),
  teacher: text('teacher'),
  level: text('level'),                               // free-form: "beginner", "open", "zaawansowany" …
  style: text('style'),                               // yoga style / class category
  location: text('location'),                         // room / branch name when multi-location

  // ── Capacity / availability ────────────────────────────────
  totalCapacity: integer('total_capacity'),
  spotsLeft: integer('spots_left'),
  waitingListCapacity: integer('waiting_list_capacity'),

  // ── Flags ──────────────────────────────────────────────────
  isCancelled: integer('is_cancelled', { mode: 'boolean' }).default(false),
  isFree: integer('is_free', { mode: 'boolean' }).default(false),
  isBookableOnline: integer('is_bookable_online', { mode: 'boolean' }).default(true),

  // ── Provenance ─────────────────────────────────────────────
  source: text('source').notNull().default('manual'), // 'fitssey' | 'activenow' | 'efitness' | 'crawl4ai' | 'nlm' | 'vision' | 'manual'
  externalId: text('external_id'),                    // source-specific id for dedup / updates
  bookingUrl: text('booking_url'),                    // direct link to book this class

  // ── Catch-all for platform-specific extras ─────────────────
  metadata: text('metadata', { mode: 'json' }),

  // ── Housekeeping ───────────────────────────────────────────
  lastSeenAt: text('last_seen_at').default(sql`(CURRENT_TIMESTAMP)`),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ── Scrape Log (written by yoga-scraper, read-only from web) ────────────────
//
//  Tracks every scrape attempt: what was done, success/failure, timing.
//  Used by the scraper's `status` command to report freshness & errors.
//

export const scrapeLog = sqliteTable('scrape_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  task: text('task').notNull(),             // 'seed' | 'discover_urls' | 'scrape_pricing' | 'scrape_about' | 'scrape_schedule' | 'normalize'
  status: text('status').notNull(),         // 'success' | 'error' | 'skipped' | 'no_data'
  message: text('message'),                 // error message or summary
  fieldsUpdated: text('fields_updated'),    // comma-separated list of updated fields
  durationMs: integer('duration_ms'),       // how long the operation took
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ── Claim Requests ──────────────────────────────────────────────────────────

export const claimRequests = sqliteTable('claim_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  role: text('role').notNull(),           // 'owner' | 'manager' | 'instructor'
  message: text('message'),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ── Geocoded Streets (cache for Nominatim lookups) ──────────────────────────

export const geocodedStreets = sqliteTable('geocoded_streets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  city: text('city').notNull(),
  street: text('street').notNull(),
  placeId: text('place_id'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  source: text('source').default('nominatim'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => ({
  unq: unique().on(table.city, table.street),
}));

// ── School Reviews (Google Places reviews) ──────────────────────────────────

export const schoolReviews = sqliteTable('school_reviews', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  authorName: text('author_name').notNull(),
  rating: integer('rating').notNull(),
  text: text('text'),
  relativeTime: text('relative_time'),
  publishedAt: text('published_at'),
  language: text('language').default('pl'),
  source: text('source').default('google'),
});

// ── Walking Distances (cached Routes API results) ───────────────────────────

export const walkingDistances = sqliteTable('walking_distances', {
  id: text('id').primaryKey(),
  originLat: real('origin_lat').notNull(),
  originLng: real('origin_lng').notNull(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  distanceMeters: integer('distance_meters').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ── API usage tracking (monthly budget caps) ────────────────────────────────

export const apiUsage = sqliteTable('api_usage', {
  id: text('id').primaryKey(),           // e.g. "places_2026-03"
  apiName: text('api_name').notNull(),   // e.g. "places"
  month: text('month').notNull(),        // "YYYY-MM"
  calls: integer('calls').notNull().default(0),
});

// ── Cities (search routing + metadata) ──────────────────────────────────────

export const cities = sqliteTable('cities', {
  slug: text('slug').primaryKey(),             // "krakow"
  name: text('name').notNull(),                // "Kraków"
  nameN: text('name_n').notNull(),             // "krakow"
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  schoolCount: integer('school_count').notNull().default(0),
  districts: text('districts').notNull().default('[]'),  // JSON array of district names
});

// ── Search synonyms (misspellings → canonical terms) ────────────────────────

export const searchSynonyms = sqliteTable('search_synonyms', {
  alias: text('alias').notNull(),
  canonical: text('canonical').notNull(),
  category: text('category').notNull(),        // 'style', 'city', 'general'
}, (table) => ({
  pk: unique().on(table.alias, table.canonical),
}));

// ── School trigrams (fuzzy matching fallback) ───────────────────────────────

export const schoolTrigrams = sqliteTable('school_trigrams', {
  trigram: text('trigram').notNull(),
  schoolId: text('school_id').notNull(),
  field: text('field').notNull(),              // 'name','city','style','district','street'
});

// ── Type exports ────────────────────────────────────────────────────────────

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;
export type Style = typeof styles.$inferSelect;
export type ScheduleEntry = typeof scheduleEntries.$inferSelect;
export type NewScheduleEntry = typeof scheduleEntries.$inferInsert;
export type ScrapeLog = typeof scrapeLog.$inferSelect;
export type ClaimRequest = typeof claimRequests.$inferSelect;
export type NewClaimRequest = typeof claimRequests.$inferInsert;
export type SchoolReview = typeof schoolReviews.$inferSelect;
export type WalkingDistance = typeof walkingDistances.$inferSelect;
export type ApiUsage = typeof apiUsage.$inferSelect;
export type City = typeof cities.$inferSelect;
export type SearchSynonym = typeof searchSynonyms.$inferSelect;
