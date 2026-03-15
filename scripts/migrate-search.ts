/**
 * Search infrastructure migration.
 *
 * Adds normalized shadow columns, cities table, FTS5 index, trigrams,
 * and synonyms to the existing Turso database.
 *
 * Usage:
 *   npx tsx scripts/migrate-search.ts
 *   npx tsx scripts/migrate-search.ts --dry-run   # preview without writes
 */

import 'dotenv/config';
import { createClient, type InStatement } from '@libsql/client';

const DRY_RUN = process.argv.includes('--dry-run');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ── Normalization (inline — same logic as search/normalize.ts) ──────────────

const POLISH_MAP: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
  Ą: 'A', Ć: 'C', Ę: 'E', Ł: 'L', Ń: 'N', Ó: 'O', Ś: 'S', Ź: 'Z', Ż: 'Z',
};

function stripDiacritics(text: string): string {
  // Polish-specific first (Ł→L is not standard NFD decomposition)
  let result = text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (ch) => POLISH_MAP[ch] ?? ch);
  // Then strip remaining combining marks via NFD
  result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return result;
}

function normalize(text: string): string {
  return stripDiacritics(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeSlug(text: string): string {
  return normalize(text).replace(/\s+/g, '-').replace(/-+/g, '-');
}

function extractStreet(address: string): string {
  return address
    .replace(/^(ul\.|al\.|os\.|pl\.)\s*/i, '')
    .replace(/\s+\d+[a-zA-Z]?(\s*\/\s*\d+)?$/, '')
    .trim();
}

function extractPostcode(address: string): string | null {
  const match = address.match(/\b(\d{2}-\d{3})\b/);
  return match ? match[1] : null;
}

function generateTrigrams(text: string): string[] {
  const n = normalize(text);
  if (n.length < 3) return [];
  const seen = new Set<string>();
  const tris: string[] = [];
  for (let i = 0; i <= n.length - 3; i++) {
    const tri = n.substring(i, i + 3);
    if (!seen.has(tri)) {
      seen.add(tri);
      tris.push(tri);
    }
  }
  return tris;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function exec(sqlStr: string) {
  if (DRY_RUN) {
    console.log(`  [DRY] ${sqlStr.substring(0, 120)}...`);
    return;
  }
  await client.execute(sqlStr);
}

async function query(sqlStr: string, args: (string | number | null)[] = []) {
  return client.execute({ sql: sqlStr, args });
}

function log(step: string, detail?: string) {
  console.log(`\n── ${step} ${detail ? `(${detail})` : ''} ──`);
}

// ── Step 1: Add columns to schools ──────────────────────────────────────────

async function addSchoolColumns() {
  log('Step 1', 'Add normalized columns to schools');

  const columns = [
    ['name_n', "TEXT DEFAULT ''"],
    ['city_n', "TEXT DEFAULT ''"],
    ['city_slug', "TEXT DEFAULT ''"],
    ['street_n', "TEXT DEFAULT ''"],
    ['district_n', "TEXT DEFAULT ''"],
    ['styles_n', "TEXT DEFAULT ''"],
    ['description_n', "TEXT DEFAULT ''"],
    ['postcode', 'TEXT'],
    ['slug', 'TEXT'],
  ];

  for (const [colName, colType] of columns) {
    try {
      await exec(`ALTER TABLE schools ADD COLUMN ${colName} ${colType}`);
      console.log(`  + schools.${colName}`);
    } catch (e: any) {
      if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
        console.log(`  ~ schools.${colName} (already exists)`);
      } else {
        throw e;
      }
    }
  }

  // Add indexes
  await exec('CREATE INDEX IF NOT EXISTS idx_schools_city_slug ON schools(city_slug)');
  await exec('CREATE INDEX IF NOT EXISTS idx_schools_city_n ON schools(city_n)');
  await exec('CREATE INDEX IF NOT EXISTS idx_schools_postcode ON schools(postcode)');
  await exec('CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(slug)');
  console.log('  + indexes created');
}

// ── Step 2: Add columns to styles ───────────────────────────────────────────

async function addStyleColumns() {
  log('Step 2', 'Add search columns to styles');

  const columns = [
    ['slug', 'TEXT'],
    ['name_n', "TEXT DEFAULT ''"],
    ['aliases_n', "TEXT DEFAULT ''"],
    ['school_count', 'INTEGER DEFAULT 0'],
  ];

  for (const [colName, colType] of columns) {
    try {
      await exec(`ALTER TABLE styles ADD COLUMN ${colName} ${colType}`);
      console.log(`  + styles.${colName}`);
    } catch (e: any) {
      if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
        console.log(`  ~ styles.${colName} (already exists)`);
      } else {
        throw e;
      }
    }
  }
}

// ── Step 3: Create new tables ───────────────────────────────────────────────

async function createNewTables() {
  log('Step 3', 'Create cities, school_trigrams, search_synonyms');

  await exec(`
    CREATE TABLE IF NOT EXISTS cities (
      slug          TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      name_n        TEXT NOT NULL,
      lat           REAL NOT NULL,
      lng           REAL NOT NULL,
      school_count  INTEGER NOT NULL DEFAULT 0,
      districts     TEXT NOT NULL DEFAULT '[]'
    )
  `);
  console.log('  + cities table');

  await exec('CREATE INDEX IF NOT EXISTS idx_cities_name_n ON cities(name_n)');

  await exec(`
    CREATE TABLE IF NOT EXISTS school_trigrams (
      trigram    TEXT NOT NULL,
      school_id TEXT NOT NULL,
      field     TEXT NOT NULL
    )
  `);
  console.log('  + school_trigrams table');

  await exec('CREATE INDEX IF NOT EXISTS idx_trigrams_lookup ON school_trigrams(trigram, field)');

  await exec(`
    CREATE TABLE IF NOT EXISTS search_synonyms (
      alias     TEXT NOT NULL,
      canonical TEXT NOT NULL,
      category  TEXT NOT NULL,
      PRIMARY KEY (alias, canonical)
    )
  `);
  console.log('  + search_synonyms table');

  await exec('CREATE INDEX IF NOT EXISTS idx_synonyms_alias ON search_synonyms(alias)');
}

// ── Step 4: Backfill normalized columns on schools ──────────────────────────

async function backfillSchools() {
  log('Step 4', 'Backfill _n columns on schools');
  if (DRY_RUN) { console.log('  [DRY] skipping backfill'); return; }

  const result = await query(`
    SELECT id, name, city, address, neighborhood, description, description_raw
    FROM schools
  `);

  const rows = result.rows;
  console.log(`  Processing ${rows.length} schools...`);

  let slugSet = new Set<string>();

  for (const row of rows) {
    const id = row.id as string;
    const name = (row.name as string) || '';
    const city = (row.city as string) || '';
    const address = (row.address as string) || '';
    const neighborhood = (row.neighborhood as string) || '';
    const desc = (row.description as string) || (row.description_raw as string) || '';

    const nameN = normalize(name);
    const cityN = normalize(city);
    const citySlug = makeSlug(city);
    const streetN = normalize(extractStreet(address));
    const districtN = normalize(neighborhood);
    const descriptionN = normalize(desc).substring(0, 500); // truncate for search
    const postcode = extractPostcode(address);

    // Generate unique slug
    let baseSlug = makeSlug(`${name} ${city}`);
    let slug = baseSlug;
    let suffix = 1;
    while (slugSet.has(slug)) {
      slug = `${baseSlug}-${suffix++}`;
    }
    slugSet.add(slug);

    await client.execute({
      sql: `UPDATE schools SET
        name_n = ?, city_n = ?, city_slug = ?, street_n = ?,
        district_n = ?, description_n = ?, postcode = ?, slug = ?
        WHERE id = ?`,
      args: [nameN, cityN, citySlug, streetN, districtN, descriptionN, postcode, slug, id],
    });
  }

  console.log(`  Backfilled ${rows.length} schools`);
}

// ── Step 5: Populate cities from schools ────────────────────────────────────

async function populateCities() {
  log('Step 5', 'Populate cities table from schools');
  if (DRY_RUN) { console.log('  [DRY] skipping'); return; }

  const result = await query(`
    SELECT
      city,
      city_slug,
      city_n,
      COUNT(*) as cnt,
      AVG(latitude) as avg_lat,
      AVG(longitude) as avg_lng
    FROM schools
    WHERE is_listed = 1 AND city != '' AND latitude IS NOT NULL
    GROUP BY city_slug
  `);

  for (const row of result.rows) {
    const city = row.city as string;
    const citySlug = row.city_slug as string;
    const cityN = row.city_n as string;
    const cnt = row.cnt as number;
    const lat = row.avg_lat as number;
    const lng = row.avg_lng as number;

    if (!citySlug || !lat || !lng) continue;

    // Get distinct neighborhoods/districts for this city
    const distResult = await query(`
      SELECT DISTINCT neighborhood FROM schools
      WHERE city_slug = ? AND neighborhood != '' AND is_listed = 1
    `, [citySlug]);

    const districts = distResult.rows
      .map(r => r.neighborhood as string)
      .filter(Boolean);

    await client.execute({
      sql: `INSERT OR REPLACE INTO cities (slug, name, name_n, lat, lng, school_count, districts)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [citySlug, city, cityN, lat, lng, cnt, JSON.stringify(districts)],
    });
  }

  console.log(`  Populated ${result.rows.length} cities`);
}

// ── Step 6: Backfill styles metadata ────────────────────────────────────────

// Style aliases for common Polish misspellings/variations
const STYLE_ALIASES: Record<string, string> = {
  'hatha': 'hatha hata hatha joga',
  'vinyasa': 'vinyasa wiynasa winjasa vinjasa wynasa vinyasa joga',
  'ashtanga': 'ashtanga astanga asztanga ashtanga joga',
  'yin': 'yin jin yin joga jin joga',
  'kundalini': 'kundalini kundalini joga',
  'power yoga': 'power yoga power joga',
  'aerial': 'aerial aerial joga aerial yoga',
  'joga w ciąży': 'joga w ciazy joga ciazowa prenatal prenatal yoga',
};

async function backfillStyles() {
  log('Step 6', 'Backfill styles with slug, name_n, aliases, counts');
  if (DRY_RUN) { console.log('  [DRY] skipping'); return; }

  const result = await query('SELECT id, name FROM styles');

  for (const row of result.rows) {
    const id = row.id as number;
    const name = (row.name as string) || '';
    const nameN = normalize(name);
    const slug = makeSlug(name) || nameN.replace(/\s+/g, '-');
    const aliasesN = STYLE_ALIASES[nameN] || nameN;

    // Count schools with this style
    const countResult = await query(
      'SELECT COUNT(*) as cnt FROM school_styles WHERE style_id = ?',
      [id]
    );
    const schoolCount = (countResult.rows[0]?.cnt as number) || 0;

    await client.execute({
      sql: 'UPDATE styles SET slug = ?, name_n = ?, aliases_n = ?, school_count = ? WHERE id = ?',
      args: [slug, nameN, aliasesN, schoolCount, id],
    });

    console.log(`  ${name} → slug="${slug}" aliases="${aliasesN}" (${schoolCount} schools)`);
  }
}

// ── Step 7: Build styles_n from junction table ──────────────────────────────

async function buildStylesN() {
  log('Step 7', 'Build styles_n on schools from junction table');
  if (DRY_RUN) { console.log('  [DRY] skipping'); return; }

  const result = await query(`
    SELECT s.id as school_id, GROUP_CONCAT(st.name, '||') as style_names
    FROM schools s
    JOIN school_styles ss ON ss.school_id = s.id
    JOIN styles st ON st.id = ss.style_id
    GROUP BY s.id
  `);

  let count = 0;
  for (const row of result.rows) {
    const schoolId = row.school_id as string;
    const styleNames = (row.style_names as string) || '';
    const stylesN = styleNames
      .split('||')
      .map(n => normalize(n))
      .join(' ');

    await client.execute({
      sql: 'UPDATE schools SET styles_n = ? WHERE id = ?',
      args: [stylesN, schoolId],
    });
    count++;
  }

  console.log(`  Built styles_n for ${count} schools`);
}

// ── Step 8: Create FTS5 virtual table + triggers ────────────────────────────

async function createFts5() {
  log('Step 8', 'Create FTS5 virtual table and sync triggers');

  // Schools table uses TEXT id, so FTS5 uses the implicit integer rowid
  await exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS schools_fts USING fts5(
      name_n,
      styles_n,
      city_n,
      district_n,
      street_n,
      postcode,
      description_n,
      content='schools',
      content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 2'
    )
  `);
  console.log('  + schools_fts virtual table');

  // Sync triggers — use rowid since our PK is TEXT
  await exec(`
    CREATE TRIGGER IF NOT EXISTS schools_fts_ai AFTER INSERT ON schools BEGIN
      INSERT INTO schools_fts(rowid, name_n, styles_n, city_n, district_n, street_n, postcode, description_n)
      VALUES (new.rowid, new.name_n, new.styles_n, new.city_n, new.district_n, new.street_n, new.postcode, new.description_n);
    END
  `);

  await exec(`
    CREATE TRIGGER IF NOT EXISTS schools_fts_ad AFTER DELETE ON schools BEGIN
      INSERT INTO schools_fts(schools_fts, rowid, name_n, styles_n, city_n, district_n, street_n, postcode, description_n)
      VALUES ('delete', old.rowid, old.name_n, old.styles_n, old.city_n, old.district_n, old.street_n, old.postcode, old.description_n);
    END
  `);

  await exec(`
    CREATE TRIGGER IF NOT EXISTS schools_fts_au AFTER UPDATE ON schools BEGIN
      INSERT INTO schools_fts(schools_fts, rowid, name_n, styles_n, city_n, district_n, street_n, postcode, description_n)
      VALUES ('delete', old.rowid, old.name_n, old.styles_n, old.city_n, old.district_n, old.street_n, old.postcode, old.description_n);
      INSERT INTO schools_fts(rowid, name_n, styles_n, city_n, district_n, street_n, postcode, description_n)
      VALUES (new.rowid, new.name_n, new.styles_n, new.city_n, new.district_n, new.street_n, new.postcode, new.description_n);
    END
  `);
  console.log('  + FTS5 sync triggers');

  // Rebuild FTS index from existing data
  if (!DRY_RUN) {
    await exec("INSERT INTO schools_fts(schools_fts) VALUES('rebuild')");
    console.log('  + FTS5 index rebuilt');
  }
}

// ── Step 9: Build trigrams ──────────────────────────────────────────────────

async function buildTrigrams() {
  log('Step 9', 'Build trigrams for all schools');
  if (DRY_RUN) { console.log('  [DRY] skipping'); return; }

  // Clear existing trigrams
  await exec('DELETE FROM school_trigrams');

  const result = await query(`
    SELECT id, name_n, city_n, district_n, street_n, styles_n
    FROM schools
  `);

  const BATCH_SIZE = 100;
  let batch: InStatement[] = [];
  let totalTrigrams = 0;

  for (const row of result.rows) {
    const schoolId = row.id as string;
    const fields: [string, string][] = [
      ['name', (row.name_n as string) || ''],
      ['city', (row.city_n as string) || ''],
      ['district', (row.district_n as string) || ''],
      ['street', (row.street_n as string) || ''],
    ];

    // Styles: generate trigrams for each style token
    const stylesN = (row.styles_n as string) || '';
    for (const token of stylesN.split(/\s+/).filter(Boolean)) {
      fields.push(['style', token]);
    }

    for (const [field, text] of fields) {
      if (!text) continue;
      const tris = generateTrigrams(text);
      for (const tri of tris) {
        batch.push({
          sql: 'INSERT INTO school_trigrams (trigram, school_id, field) VALUES (?, ?, ?)',
          args: [tri, schoolId, field],
        });
        totalTrigrams++;

        if (batch.length >= BATCH_SIZE) {
          await client.batch(batch, 'write');
          batch = [];
        }
      }
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    await client.batch(batch, 'write');
  }

  console.log(`  Built ${totalTrigrams} trigrams for ${result.rows.length} schools`);
}

// ── Step 10: Seed synonyms ──────────────────────────────────────────────────

async function seedSynonyms() {
  log('Step 10', 'Seed search synonyms');

  const synonyms: [string, string, string][] = [
    // Yoga ↔ Joga
    ['joga', 'yoga', 'style'], ['jodga', 'yoga', 'style'], ['jogga', 'yoga', 'style'],
    // Vinyasa misspellings
    ['wiynasa', 'vinyasa', 'style'], ['winjasa', 'vinyasa', 'style'],
    ['vinjasa', 'vinyasa', 'style'], ['wynasa', 'vinyasa', 'style'],
    // Other styles
    ['hata', 'hatha', 'style'], ['astanga', 'ashtanga', 'style'],
    ['asztanga', 'ashtanga', 'style'], ['jin', 'yin', 'style'],
    // Polish compound style names
    ['hatha joga', 'hatha yoga', 'style'], ['ashtanga joga', 'ashtanga yoga', 'style'],
    ['iyengar joga', 'iyengar yoga', 'style'], ['kundalini joga', 'kundalini yoga', 'style'],
    ['jin joga', 'yin yoga', 'style'], ['bikram joga', 'bikram yoga', 'style'],
    ['power joga', 'power yoga', 'style'],
    // City misspellings & English names
    ['warsawa', 'warszawa', 'city'], ['warsaw', 'warszawa', 'city'],
    ['warshawa', 'warszawa', 'city'], ['varsava', 'warszawa', 'city'],
    ['cracow', 'krakow', 'city'], ['lodz', 'lodz', 'city'],
    ['breslau', 'wroclaw', 'city'],
    // General terms
    ['szkola', 'szkola', 'general'], ['centrum', 'centrum', 'general'],
    ['blisko', 'near', 'general'], ['niedaleko', 'near', 'general'],
    ['w poblizu', 'near', 'general'],
  ];

  const batch: InStatement[] = synonyms.map(([alias, canonical, category]) => ({
    sql: 'INSERT OR IGNORE INTO search_synonyms (alias, canonical, category) VALUES (?, ?, ?)',
    args: [alias, canonical, category],
  }));

  if (!DRY_RUN) {
    await client.batch(batch, 'write');
  }

  console.log(`  Seeded ${synonyms.length} synonyms`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Search Infrastructure Migration${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`${'='.repeat(60)}`);

  const start = Date.now();

  await addSchoolColumns();      // Step 1
  await addStyleColumns();       // Step 2
  await createNewTables();       // Step 3
  await backfillSchools();       // Step 4
  await populateCities();        // Step 5
  await backfillStyles();        // Step 6
  await buildStylesN();          // Step 7
  await createFts5();            // Step 8
  await buildTrigrams();         // Step 9
  await seedSynonyms();          // Step 10

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Done in ${elapsed}s`);
  console.log(`${'='.repeat(60)}\n`);

  // Verify
  if (!DRY_RUN) {
    console.log('Verification:');

    const schoolCount = await query('SELECT COUNT(*) as cnt FROM schools WHERE name_n != ""');
    console.log(`  Schools with name_n: ${schoolCount.rows[0]?.cnt}`);

    const cityCount = await query('SELECT COUNT(*) as cnt FROM cities');
    console.log(`  Cities: ${cityCount.rows[0]?.cnt}`);

    const styleCount = await query('SELECT COUNT(*) as cnt FROM styles WHERE name_n != "" AND name_n IS NOT NULL');
    console.log(`  Styles with name_n: ${styleCount.rows[0]?.cnt}`);

    const trigramCount = await query('SELECT COUNT(*) as cnt FROM school_trigrams');
    console.log(`  Trigrams: ${trigramCount.rows[0]?.cnt}`);

    const synonymCount = await query('SELECT COUNT(*) as cnt FROM search_synonyms');
    console.log(`  Synonyms: ${synonymCount.rows[0]?.cnt}`);

    // Test FTS5
    try {
      const ftsTest = await query("SELECT COUNT(*) as cnt FROM schools_fts WHERE schools_fts MATCH 'yoga'");
      console.log(`  FTS5 "yoga" matches: ${ftsTest.rows[0]?.cnt}`);
    } catch (e: any) {
      console.log(`  FTS5 test: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error('\nMigration failed:', e);
  process.exit(1);
});
