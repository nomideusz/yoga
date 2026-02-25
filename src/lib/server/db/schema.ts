import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ── Schools (main listing) ──────────────────────────────────────────────────

export const schools = sqliteTable('schools', {
  id: text('id').primaryKey(),                        // slug, e.g. "yoga-republic"
  name: text('name').notNull(),
  city: text('city').notNull(),
  address: text('address').notNull().default(''),
  websiteUrl: text('website_url').default(''),
  phone: text('phone'),
  email: text('email'),

  // Pricing
  price: real('price'),                               // monthly pass PLN
  trialPrice: real('trial_price'),                    // first class PLN (0 = free)
  singleClassPrice: real('single_class_price'),
  pricingNotes: text('pricing_notes'),

  // Ratings
  rating: real('rating'),                             // Google Maps rating
  reviews: integer('reviews'),                        // review count

  // Content
  descriptionRaw: text('description_raw').default(''),
  description: text('description').default(''),
  editorialSummary: text('editorial_summary').default(''),  // Google's blurb
  openingHours: text('opening_hours').default(''),          // e.g. "Mon: 7-21 | Tue: 7-21 ..."
  imageUrl: text('image_url').default(''),
  photoReference: text('photo_reference').default(''),      // Places Photos API ref

  // Location
  neighborhood: text('neighborhood').default(''),           // district / osiedle
  latitude: real('latitude'),
  longitude: real('longitude'),

  // Google Places
  googlePlaceId: text('google_place_id').default(''),
  googleMapsUrl: text('google_maps_url').default(''),

  // Meta
  lastPriceCheck: text('last_price_check'),
  lastUpdated: text('last_updated').default(sql`(CURRENT_DATE)`),
  source: text('source').default('manual'),           // 'manual' | 'crawl4ai' | 'google-places'

  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ── Styles (many-to-many via junction) ──────────────────────────────────────

export const styles = sqliteTable('styles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),              // e.g. "Ashtanga", "Vinyasa"
});

export const schoolStyles = sqliteTable('school_styles', {
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  styleId: integer('style_id').notNull().references(() => styles.id, { onDelete: 'cascade' }),
});

// ── Schedule ────────────────────────────────────────────────────────────────

export const scheduleEntries = sqliteTable('schedule_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  day: text('day').notNull(),                         // "Poniedziałek"
  time: text('time').notNull(),                       // "07:00-08:30"
  className: text('class_name').notNull(),            // "Mysore Ashtanga"
  instructor: text('instructor'),
  level: text('level'),
});

// ── Type exports ────────────────────────────────────────────────────────────

export type School = typeof schools.$inferSelect;
export type NewSchool = typeof schools.$inferInsert;
export type Style = typeof styles.$inferSelect;
export type ScheduleEntry = typeof scheduleEntries.$inferSelect;
