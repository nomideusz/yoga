/**
 * Refresh the cities table from schools.
 *
 * - Updates school_count + districts for existing cities (keeps curated
 *   lat/lng and name_loc)
 * - Inserts cities that gained their first listed school (averaged school
 *   coords, name_loc via polishLocative)
 * - Zeroes school_count for cities that lost all listed schools (row kept —
 *   the resolver uses it to redirect to the nearest city with schools)
 *
 * Run after renormalize-search.ts whenever schools were imported or
 * (un)listed. Assumes canonical city_slug values (renormalize derives them).
 *
 * Usage:
 *   npx tsx scripts/refresh-cities.ts
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { polishLocative } from '@nomideusz/svelte-search/locales/pl';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const agg = await client.execute(`
    SELECT city, city_slug, city_n, COUNT(*) cnt, AVG(latitude) lat, AVG(longitude) lng
    FROM schools
    WHERE is_listed = 1 AND city != '' AND latitude IS NOT NULL
    GROUP BY city_slug
  `);

  const existing = new Set(
    (await client.execute('SELECT slug FROM cities')).rows.map((r) => r.slug as string),
  );

  for (const row of agg.rows as any[]) {
    if (!row.city_slug) {
      console.log('SKIP (no slug):', row.city);
      continue;
    }
    const dist = await client.execute({
      sql: `SELECT DISTINCT neighborhood FROM schools WHERE city_slug = ? AND neighborhood != '' AND is_listed = 1`,
      args: [row.city_slug],
    });
    const districts = JSON.stringify(dist.rows.map((r) => r.neighborhood as string).filter(Boolean));

    if (existing.has(row.city_slug)) {
      await client.execute({
        sql: 'UPDATE cities SET school_count = ?, districts = ? WHERE slug = ?',
        args: [row.cnt, districts, row.city_slug],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO cities (slug, name, name_n, lat, lng, school_count, districts, name_loc)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [row.city_slug, row.city, row.city_n, row.lat, row.lng, row.cnt, districts, polishLocative(row.city)],
      });
      console.log('INSERTED city:', row.city, `(${row.cnt} schools)`);
    }
  }

  const slugsWithSchools = new Set(agg.rows.map((r: any) => r.city_slug as string));
  for (const slug of existing) {
    if (!slugsWithSchools.has(slug)) {
      await client.execute({ sql: 'UPDATE cities SET school_count = 0 WHERE slug = ?', args: [slug] });
      console.log('ZEROED count:', slug);
    }
  }
  console.log(`Done. ${agg.rows.length} cities refreshed.`);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
