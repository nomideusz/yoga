/**
 * Add name_loc column to cities table and populate with Polish locative forms.
 * The locative is used in "Hatha w Krakowie" display.
 *
 * Usage:
 *   npx tsx scripts/add-city-locative.ts
 *   npx tsx scripts/add-city-locative.ts --dry-run   # preview without writing
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { polishLocative } from '../src/lib/search/normalize';

const dryRun = process.argv.includes('--dry-run');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // 1. Add column if it doesn't exist
  console.log('Adding name_loc column to cities table...');
  try {
    await client.execute('ALTER TABLE cities ADD COLUMN name_loc TEXT');
    console.log('  Column added.');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      console.log('  Column already exists, skipping.');
    } else {
      throw e;
    }
  }

  // 2. Read all cities
  const rows = await client.execute('SELECT slug, name FROM cities ORDER BY name');
  console.log(`\nFound ${rows.rows.length} cities. Generating locative forms:\n`);

  const updates: { slug: string; name: string; locative: string }[] = [];
  for (const row of rows.rows as any[]) {
    const locative = polishLocative(row.name);
    updates.push({ slug: row.slug, name: row.name, locative });
    console.log(`  ${row.name.padEnd(30)} → ${locative}`);
  }

  // 3. Apply updates
  if (dryRun) {
    console.log('\n--dry-run: no changes written. Review above and run without --dry-run.');
    return;
  }

  console.log('\nWriting locative forms to DB...');
  for (const u of updates) {
    await client.execute({
      sql: 'UPDATE cities SET name_loc = ? WHERE slug = ?',
      args: [u.locative, u.slug],
    });
  }
  console.log(`Done. ${updates.length} cities updated.`);
  console.log('\nReview the output above. To fix any incorrect forms:');
  console.log('  UPDATE cities SET name_loc = \'correct form\' WHERE slug = \'city-slug\';');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
