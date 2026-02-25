/**
 * Seed the Turso/SQLite database from existing data.json.
 *
 * Usage:
 *   npx tsx scripts/seed-db.ts                 # seed from data.json
 *   npx tsx scripts/seed-db.ts --clear         # clear tables first, then seed
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/server/db/schema';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_JSON_PATH = path.resolve(__dirname, '../src/lib/data.json');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

interface JsonListing {
  id: string;
  name: string;
  city: string;
  address: string;
  neighborhood?: string;
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
  editorialSummary?: string;
  openingHours?: string;
  schedule: {
    day: string;
    time: string;
    class_name: string;
    instructor?: string | null;
    level?: string | null;
  }[];
  imageUrl: string;
  photoReference?: string;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string;
  googleMapsUrl?: string;
  lastPriceCheck: string | null;
  lastUpdated: string;
  source: string;
}

async function clearTables() {
  console.log('Clearing existing data...');
  await db.delete(schema.scheduleEntries);
  await db.delete(schema.schoolStyles);
  await db.delete(schema.schools);
  // Don't delete styles — they can be reused
}

async function getOrCreateStyle(name: string): Promise<number> {
  // Try to find existing
  const existing = await db
    .select()
    .from(schema.styles)
    .where(eq(schema.styles.name, name))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  // Insert new
  const result = await db
    .insert(schema.styles)
    .values({ name })
    .returning({ id: schema.styles.id });

  return result[0].id;
}

async function seedFromJson() {
  if (!fs.existsSync(DATA_JSON_PATH)) {
    console.error(`data.json not found at ${DATA_JSON_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_JSON_PATH, 'utf-8');
  const listings: JsonListing[] = JSON.parse(raw);

  console.log(`Seeding ${listings.length} listings from data.json...`);

  let created = 0;
  let skipped = 0;

  for (const listing of listings) {
    // Check if school already exists
    const existing = await db
      .select({ id: schema.schools.id })
      .from(schema.schools)
      .where(eq(schema.schools.id, listing.id))
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    // Insert school
    await db.insert(schema.schools).values({
      id: listing.id,
      name: listing.name,
      city: listing.city,
      address: listing.address,
      neighborhood: listing.neighborhood || '',
      websiteUrl: listing.websiteUrl || '',
      phone: listing.phone,
      email: listing.email,
      price: listing.price,
      trialPrice: listing.trialPrice,
      singleClassPrice: listing.singleClassPrice,
      pricingNotes: listing.pricingNotes,
      rating: listing.rating,
      reviews: listing.reviews,
      descriptionRaw: listing.descriptionRaw || '',
      description: listing.description || '',
      editorialSummary: listing.editorialSummary || '',
      openingHours: listing.openingHours || '',
      imageUrl: listing.imageUrl || '',
      photoReference: listing.photoReference || '',
      latitude: listing.latitude ?? null,
      longitude: listing.longitude ?? null,
      googlePlaceId: listing.googlePlaceId || '',
      googleMapsUrl: listing.googleMapsUrl || '',
      lastPriceCheck: listing.lastPriceCheck,
      lastUpdated: listing.lastUpdated,
      source: listing.source || 'manual',
    });

    // Insert styles
    for (const styleName of listing.styles) {
      const styleId = await getOrCreateStyle(styleName);
      await db.insert(schema.schoolStyles).values({
        schoolId: listing.id,
        styleId,
      });
    }

    // Insert schedule
    for (const entry of listing.schedule || []) {
      await db.insert(schema.scheduleEntries).values({
        schoolId: listing.id,
        day: entry.day,
        time: entry.time,
        className: entry.class_name,
        instructor: entry.instructor || null,
        level: entry.level || null,
      });
    }

    created++;
  }

  console.log(`Done! Created: ${created}, Skipped (existing): ${skipped}`);
}

async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');

  if (shouldClear) {
    await clearTables();
  }

  await seedFromJson();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
