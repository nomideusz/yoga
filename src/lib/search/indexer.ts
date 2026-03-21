// ============================================================
// src/lib/search/indexer.ts
// ============================================================
// Write operations: inserting schools, building trigrams,
// and loading resolver lookup tables from the database.

import type { Client } from '@libsql/client';
import { normalize, trigrams } from './normalize';
import type { ResolverLookups } from './resolver';

// ── Insert a school ────────────────────────────────────────

export interface SchoolInput {
  name: string;
  styles: string[];
  street?: string | null;
  district?: string | null;
  city: string;
  citySlug: string;
  voivodeship?: string | null;
  postcode?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
}

export async function insertSchool(db: Client, input: SchoolInput): Promise<number> {
  const slug = makeSlug(input.name, input.city);
  const stylesJson = JSON.stringify(input.styles);
  const stylesNorm = input.styles.map(s => normalize(s)).join(' ');

  const result = await db.execute({
    sql: `INSERT INTO schools (
      name, name_n, slug, styles, styles_n,
      street, street_n, district, district_n,
      city, city_n, city_slug, voivodeship, voivodeship_n,
      postcode, lat, lng, phone, email, website, description, description_n
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      input.name, normalize(input.name), slug, stylesJson, stylesNorm,
      input.street ?? null, normalize(input.street ?? ''),
      input.district ?? null, normalize(input.district ?? ''),
      input.city, normalize(input.city), input.citySlug,
      input.voivodeship ?? null, normalize(input.voivodeship ?? ''),
      input.postcode ?? null, input.lat ?? null, input.lng ?? null,
      input.phone ?? null, input.email ?? null, input.website ?? null,
      input.description ?? null, normalize(input.description ?? ''),
    ],
  });

  const schoolId = Number(result.lastInsertRowid);
  await indexTrigrams(db, schoolId, input);
  return schoolId;
}

// ── Trigram indexing ────────────────────────────────────────

async function indexTrigrams(db: Client, schoolId: number | string, input: SchoolInput) {
  await db.execute({ sql: 'DELETE FROM school_trigrams WHERE school_id = ?', args: [schoolId] });

  const entries: { trigram: string; field: string }[] = [];
  const add = (text: string | null | undefined, field: string) => {
    if (!text) return;
    for (const t of trigrams(text)) entries.push({ trigram: t, field });
  };

  add(input.name, 'name');
  add(input.city, 'city');
  add(input.district, 'district');
  add(input.street, 'street');
  input.styles.forEach(s => add(s, 'style'));

  const BATCH = 100;
  for (let i = 0; i < entries.length; i += BATCH) {
    const chunk = entries.slice(i, i + BATCH);
    const ph = chunk.map(() => '(?,?,?)').join(',');
    const args = chunk.flatMap(e => [e.trigram, schoolId, e.field]);
    await db.execute({ sql: `INSERT OR IGNORE INTO school_trigrams (trigram, school_id, field) VALUES ${ph}`, args });
  }
}

/** Rebuild all trigrams from scratch. Use for migrations. */
export async function reindexAllTrigrams(db: Client): Promise<number> {
  const result = await db.execute('SELECT * FROM schools');
  let count = 0;
  for (const row of result.rows as any[]) {
    await indexTrigrams(db, row.id, {
      name: row.name, styles: JSON.parse(row.styles || '[]'),
      street: row.address, district: row.neighborhood,
      city: row.city, citySlug: row.city_slug, voivodeship: row.voivodeship,
    });
    count++;
  }
  return count;
}

/** Rebuild FTS5 index. */
export async function rebuildFts(db: Client): Promise<void> {
  await db.execute("INSERT INTO schools_fts(schools_fts) VALUES('rebuild')");
}

/** Check if FTS5 index is in sync with schools table. Returns mismatched count. */
export async function checkFtsSync(db: Client): Promise<{ inSchools: number; inFts: number; missingFromFts: number; orphanedInFts: number }> {
  const [schoolCount, ftsCount, missing, orphaned] = await Promise.all([
    db.execute('SELECT COUNT(*) as c FROM schools'),
    db.execute('SELECT COUNT(*) as c FROM schools_fts'),
    db.execute('SELECT COUNT(*) as c FROM schools s LEFT JOIN schools_fts f ON s.rowid = f.rowid WHERE f.rowid IS NULL'),
    db.execute('SELECT COUNT(*) as c FROM schools_fts f LEFT JOIN schools s ON f.rowid = s.rowid WHERE s.rowid IS NULL'),
  ]);
  return {
    inSchools: Number((schoolCount.rows[0] as any).c),
    inFts: Number((ftsCount.rows[0] as any).c),
    missingFromFts: Number((missing.rows[0] as any).c),
    orphanedInFts: Number((orphaned.rows[0] as any).c),
  };
}

/** Re-derive all normalized shadow columns, trigrams, and FTS. Use after changing normalize(). */
export async function renormalizeAll(db: Client): Promise<number> {
  const result = await db.execute('SELECT id, name, city, city_slug, address, neighborhood, voivodeship, description, styles FROM schools');
  let count = 0;
  for (const row of result.rows as any[]) {
    const styles: string[] = (() => { try { return JSON.parse(row.styles || '[]'); } catch { return []; } })();
    await db.execute({
      sql: `UPDATE schools SET name_n=?, city_n=?, street_n=?, district_n=?, voivodeship_n=?, description_n=?, styles_n=?
            WHERE id=?`,
      args: [
        normalize(row.name || ''), normalize(row.city || ''),
        normalize(row.address || ''), normalize(row.neighborhood || ''),
        normalize(row.voivodeship || ''), normalize(row.description || ''),
        styles.map(s => normalize(s)).join(' '),
        row.id,
      ],
    });
    await indexTrigrams(db, row.id, {
      name: row.name, styles, street: row.address, district: row.neighborhood,
      city: row.city, citySlug: row.city_slug, voivodeship: row.voivodeship,
    });
    count++;
  }
  await rebuildFts(db);
  return count;
}

// ── Load resolver lookup tables ────────────────────────────

let _cachedLookups: ResolverLookups | null = null;
let _cacheTimestamp = 0;
let _pendingReload: Promise<ResolverLookups> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Load all lookup tables needed by the resolver. Cached for 5 minutes. */
export async function loadResolverLookups(db: Client): Promise<ResolverLookups> {
  const now = Date.now();
  if (_cachedLookups && (now - _cacheTimestamp) < CACHE_TTL_MS) {
    return _cachedLookups;
  }
  // Prevent concurrent reloads — second caller reuses the first's promise
  if (_pendingReload) return _pendingReload;
  _pendingReload = reloadLookups(db);
  try {
    return await _pendingReload;
  } finally {
    _pendingReload = null;
  }
}

async function reloadLookups(db: Client): Promise<ResolverLookups> {
  // Cities: normalized name → slug, school count, and coordinates
  const cityMap = new Map<string, string>();
  const citySchoolCount = new Map<string, number>();
  const cityGeo = new Map<string, { lat: number; lng: number; name: string }>();
  const cityLocative = new Map<string, string>();
  const cityRows = await db.execute('SELECT slug, name, name_n, name_loc, school_count, lat, lng FROM cities');
  for (const row of cityRows.rows as any[]) {
    cityMap.set(row.name_n, row.slug);
    citySchoolCount.set(row.slug, row.school_count ?? 0);
    if (row.name_loc) cityLocative.set(row.name, row.name_loc);
    if (row.lat != null && row.lng != null) {
      cityGeo.set(row.slug, { lat: row.lat, lng: row.lng, name: row.name });
    }
  }

  // Also add synonym aliases for cities
  const citySynonyms = await db.execute(
    "SELECT alias, canonical FROM search_synonyms WHERE category = 'city'"
  );
  for (const row of citySynonyms.rows as any[]) {
    const canonical = normalize(row.canonical);
    const slug = cityMap.get(canonical);
    if (slug) cityMap.set(normalize(row.alias), slug);
  }

  // Styles: normalized name/alias → slug
  const styleMap = new Map<string, string>();
  const styleRows = await db.execute('SELECT slug, name_n, aliases_n FROM styles');
  for (const row of styleRows.rows as any[]) {
    // "hatha yoga" → "hatha-yoga"
    styleMap.set(row.name_n, row.slug);
    // Also index individual words: "hatha" → "hatha-yoga"
    // But don't overwrite an existing full-name match (e.g. "yin" as full style
    // should not be overwritten by the word "yin" from "yin restorative")
    for (const word of row.name_n.split(/\s+/)) {
      if (word && word !== 'yoga' && word !== 'joga' && !styleMap.has(word)) {
        styleMap.set(word, row.slug);
      }
    }
    // Index aliases
    for (const alias of (row.aliases_n || '').split(/\s+/)) {
      if (alias) styleMap.set(alias, row.slug);
    }
  }

  // Also add synonym aliases for styles
  const styleSynonyms = await db.execute(
    "SELECT alias, canonical FROM search_synonyms WHERE category = 'style'"
  );
  for (const row of styleSynonyms.rows as any[]) {
    const canonical = normalize(row.canonical);
    // Find which style slug this canonical maps to
    const slug = styleMap.get(canonical);
    if (slug) styleMap.set(normalize(row.alias), slug);
  }

  // Districts: citySlug → [normalized district names]
  const districtMap = new Map<string, string[]>();
  const distRows = await db.execute('SELECT slug, districts FROM cities');
  for (const row of distRows.rows as any[]) {
    const districts = JSON.parse(row.districts || '[]') as string[];
    districtMap.set(row.slug, districts.map(d => normalize(d)));
  }

  _cachedLookups = { cityMap, styleMap, districtMap, citySchoolCount, cityGeo, cityLocative };
  _cacheTimestamp = Date.now();
  return _cachedLookups;
}

// ── Helpers ────────────────────────────────────────────────

function makeSlug(name: string, city: string): string {
  const base = normalize(`${name} ${city}`).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
