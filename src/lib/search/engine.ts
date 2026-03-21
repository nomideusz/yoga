// ============================================================
// src/lib/search/engine.ts
// ============================================================
// Does the actual database searching. Called AFTER the resolver
// decides we need to filter (not route). Handles:
//   1. Synonym expansion
//   2. FTS5 full-text search
//   3. Trigram fuzzy fallback (when FTS returns few results)
//   4. Score blending
//   5. Relevance boundaries (don't show Bydgoszcz for Inowrocław)

import type { Client } from '@libsql/client';
import {
  normalize, trigrams, trigramSimilarity, levenshteinSimilarity,
  hasGeoIntent, stripGeoIntent
} from './normalize';
import { haversineKm, walkingMinutes, boundingBox } from './geo';

// ── Query timeout ─────────────────────────────────────────

const FTS_TIMEOUT_MS = 5_000;
const FUZZY_TIMEOUT_MS = 3_000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<T>(resolve => { timer = setTimeout(() => resolve(fallback), ms); }),
  ]).finally(() => clearTimeout(timer!));
}

// ── Types ──────────────────────────────────────────────────

export interface SearchParams {
  query: string;
  citySlug?: string;   // if set, restrict to this city
  styleSlug?: string;  // if set, restrict to this style
  lat?: number;
  lng?: number;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  styles: string[];
  street: string | null;
  district: string | null;
  city: string;
  citySlug: string;
  postcode: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  distanceKm: number | null;
  walkingMin: number | null;
  score: number;
  /** @internal Used by quality gate — true if result came from FTS5 */
  _hasFts?: boolean;
  /** @internal Normalized name for quality check */
  _nameN?: string;
  /** @internal Normalized city for quality check */
  _cityN?: string;
  /** @internal Normalized styles for quality check */
  _stylesN?: string;
}

export interface SearchResponse {
  /** Primary results (within relevance boundary) */
  results: SearchResult[];
  /** "Also within reach" (just outside primary radius) */
  nearby: SearchResult[];
  /** True if we had location intent but found nothing nearby */
  noLocalResults: boolean;
  /** The place the user searched for */
  searchedPlace: string | null;
  /** Nearest city that DOES have schools (when noLocalResults=true) */
  nearestCityWithSchools: { city: string; slug: string; distanceKm: number; count: number } | null;
  totalFound: number;
}

// ── Main search function ───────────────────────────────────

export async function search(db: Client, params: SearchParams): Promise<SearchResponse> {
  const { query, citySlug, styleSlug, lat, lng, limit = 20, offset = 0 } = params;

  // If no query and no city scope, return nearest or empty
  if (!query?.trim()) {
    if (citySlug) return searchAllInCity(db, citySlug, styleSlug, lat, lng, limit);
    if (lat != null && lng != null) return geoOnlySearch(db, lat, lng, limit);
    return empty();
  }

  // Step 1: Normalize + strip geo intent
  const geoIntent = hasGeoIntent(query);
  const cleanQuery = geoIntent ? stripGeoIntent(query) : query;
  const normalized = normalize(cleanQuery);

  // If geo intent with no remaining query, do geo-only search
  if (geoIntent && !normalized) {
    if (citySlug) return searchAllInCity(db, citySlug, styleSlug, lat, lng, limit);
    if (lat != null && lng != null) return geoOnlySearch(db, lat, lng, limit);
    return empty();
  }

  // Step 2: Expand synonyms
  const expanded = await expandSynonyms(db, normalized);
  const ftsQuery = buildFtsQuery(expanded);

  // Step 3: FTS5 search (with optional city/style constraint)
  const ftsResults = await withTimeout(
    ftsSearch(db, ftsQuery, citySlug, styleSlug, limit * 3),
    FTS_TIMEOUT_MS, [],
  );

  // Step 4: Trigram fallback if FTS returned few results
  let fuzzyResults: any[] = [];
  if (ftsResults.length < 5 && normalized.length >= 3) {
    fuzzyResults = await withTimeout(
      trigramFuzzySearch(db, normalized, citySlug, limit * 2),
      FUZZY_TIMEOUT_MS, [],
    );
  }

  // Step 5: Merge, score, and rank
  const merged = deduplicateById([...ftsResults, ...fuzzyResults]);
  const scored = scoreResults(merged, normalized, lat, lng, geoIntent);

  // Step 5b: Quality gate — fuzzy-only results (no FTS match) must have
  // high Levenshtein similarity to at least one indexed field. Prevents
  // "inowroclaw" → "wroclaw" false positives (0.70 similarity) while
  // keeping genuine typo corrections like "hata" → "hatha" (0.80).
  const qualified = scored.filter(r => {
    // FTS results are already high-precision
    if (r._hasFts) return true;
    // For fuzzy-only: best field similarity must be >= 0.75
    const best = Math.max(
      levenshteinSimilarity(normalized, r._nameN || ''),
      levenshteinSimilarity(normalized, r._cityN || ''),
      levenshteinSimilarity(normalized, r._stylesN || ''),
    );
    return best >= 0.75;
  });
  qualified.sort((a, b) => b.score - a.score);

  // Step 6: Apply relevance boundaries
  return applyRelevanceBoundaries(db, qualified, lat, lng, citySlug, normalized, limit, offset);
}

// ── City-scoped: all schools (default view for city page) ──

async function searchAllInCity(
  db: Client, citySlug: string, styleSlug: string | undefined,
  lat: number | undefined, lng: number | undefined, limit: number
): Promise<SearchResponse> {
  let sql = 'SELECT * FROM schools WHERE city_slug = ?';
  const args: any[] = [citySlug];

  if (styleSlug) {
    // Filter by normalized style name in styles_n (space-separated normalized names)
    const styleName = normalize(styleSlug.replace('-yoga', ''));
    sql += ' AND styles_n LIKE ?';
    args.push(`%${styleName}%`);
  }
  sql += ' LIMIT ?';
  args.push(limit);

  const result = await db.execute({ sql, args });
  const rows = (result.rows as any[]).map(r => toSearchResult(r, lat, lng));

  if (lat != null && lng != null) {
    rows.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }
  return { results: rows, nearby: [], noLocalResults: false, searchedPlace: null, nearestCityWithSchools: null, totalFound: rows.length };
}

// ── Geo-only (no text, just "near me") ─────────────────────

async function geoOnlySearch(
  db: Client, lat: number, lng: number, limit: number
): Promise<SearchResponse> {
  const bbox = boundingBox(lat, lng, 15);
  const result = await db.execute({
    sql: `SELECT * FROM schools WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ? LIMIT ?`,
    args: [bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng, limit * 2],
  });
  const rows = (result.rows as any[]).map(r => toSearchResult(r, lat, lng));
  rows.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  const capped = rows.slice(0, limit);

  if (capped.length === 0) {
    const nearest = await findNearestCityWithSchools(db, lat, lng);
    return { results: [], nearby: [], noLocalResults: true, searchedPlace: null, nearestCityWithSchools: nearest, totalFound: 0 };
  }
  return { results: capped, nearby: [], noLocalResults: false, searchedPlace: null, nearestCityWithSchools: null, totalFound: capped.length };
}

// ── FTS5 search ────────────────────────────────────────────

async function ftsSearch(
  db: Client, ftsQuery: string, citySlug: string | undefined,
  styleSlug: string | undefined, limit: number
) {
  if (!ftsQuery) return [];

  // FTS5 uses implicit rowid; join via schools.rowid
  let sql = `
    SELECT s.*, fts.rank AS _ftsRank
    FROM schools_fts fts
    JOIN schools s ON s.rowid = fts.rowid
    WHERE schools_fts MATCH ?
  `;
  const args: any[] = [ftsQuery];

  if (citySlug) {
    sql += ' AND s.city_slug = ?';
    args.push(citySlug);
  }
  if (styleSlug) {
    const styleName = normalize(styleSlug.replace('-yoga', ''));
    sql += ' AND s.styles_n LIKE ?';
    args.push(`%${styleName}%`);
  }
  sql += ' ORDER BY fts.rank LIMIT ?';
  args.push(limit);

  const result = await db.execute({ sql, args });
  return result.rows as any[];
}

// ── Trigram fuzzy search ───────────────────────────────────

async function trigramFuzzySearch(
  db: Client, normalized: string, citySlug: string | undefined, limit: number
) {
  const queryTrigrams = trigrams(normalized);
  if (queryTrigrams.length === 0) return [];

  const placeholders = queryTrigrams.map(() => '?').join(',');
  let sql = `
    SELECT s.*, NULL AS _ftsRank,
           (COUNT(DISTINCT t.trigram) * 1.0 / ?) AS _fuzzyScore
    FROM school_trigrams t
    JOIN schools s ON s.id = t.school_id
    WHERE t.trigram IN (${placeholders})
  `;
  const args: any[] = [queryTrigrams.length, ...queryTrigrams];

  if (citySlug) {
    sql += ' AND s.city_slug = ?';
    args.push(citySlug);
  }

  // Scale minimum overlap with query length to prevent coincidental matches.
  // Short queries (3-4 chars, 1-2 trigrams): need 1-2 matches.
  // Long queries (8+ trigrams): need ~50% overlap to be meaningful.
  const minOverlap = queryTrigrams.length <= 3
    ? Math.max(1, queryTrigrams.length - 1)
    : Math.max(2, Math.ceil(queryTrigrams.length * 0.45));
  sql += ` GROUP BY t.school_id HAVING COUNT(DISTINCT t.trigram) >= ? ORDER BY _fuzzyScore DESC LIMIT ?`;
  args.push(minOverlap, limit);

  const result = await db.execute({ sql, args });
  return result.rows as any[];
}

// ── Synonym expansion ──────────────────────────────────────

async function expandSynonyms(db: Client, normalized: string): Promise<string[]> {
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const expanded: string[] = [...tokens];

  // Collect all aliases to look up: single tokens + bigrams
  const aliases: string[] = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) {
    aliases.push(`${tokens[i]} ${tokens[i + 1]}`);
  }

  // Batch lookup in a single query
  if (aliases.length > 0) {
    const placeholders = aliases.map(() => '?').join(',');
    const result = await db.execute({
      sql: `SELECT canonical FROM search_synonyms WHERE alias IN (${placeholders})`,
      args: aliases,
    });
    for (const row of result.rows as any[]) {
      if (!expanded.includes(row.canonical)) expanded.push(row.canonical as string);
    }
  }

  return expanded;
}

// ── FTS query builder ──────────────────────────────────────

const MAX_FTS_TERMS = 6;

function buildFtsQuery(tokens: string[]): string {
  const terms = tokens
    .map(t => t.replace(/['"(){}*:^~\-]/g, ''))
    .filter(Boolean)
    .slice(0, MAX_FTS_TERMS)
    .map(t => `"${t}"*`);
  if (terms.length === 0) return '';
  return terms.length === 1 ? terms[0] : terms.join(' OR ');
}

// ── Scoring ────────────────────────────────────────────────

function scoreResults(
  rows: any[], normalized: string,
  lat: number | undefined, lng: number | undefined,
  geoBoost: boolean
): SearchResult[] {
  return rows.map(row => {
    let score = 0;

    // FTS rank (negative, lower = better)
    if (row._ftsRank != null) {
      score += Math.min(1, Math.max(0, -row._ftsRank / 20)) * 0.40;
    }
    // Name similarity
    score += Math.max(
      trigramSimilarity(normalized, row.name_n || ''),
      levenshteinSimilarity(normalized, row.name_n || '')
    ) * 0.25;
    // Field match (style/city/district)
    score += Math.max(
      trigramSimilarity(normalized, row.styles_n || ''),
      trigramSimilarity(normalized, row.city_n || ''),
      trigramSimilarity(normalized, row.district_n || '')
    ) * 0.15;
    // Fuzzy score from trigram search
    if (row._fuzzyScore != null) score += row._fuzzyScore * 0.30;

    // Geo proximity — use latitude/longitude (our column names)
    let distanceKm: number | null = null;
    let walkingMin: number | null = null;
    if (lat != null && lng != null && row.latitude != null && row.longitude != null) {
      distanceKm = haversineKm(lat, lng, row.latitude, row.longitude);
      walkingMin = walkingMinutes(distanceKm);
      const proxScore = Math.max(0, 1 - distanceKm / 30);
      score += proxScore * 0.15;
      if (geoBoost) score += proxScore * 0.25;
    }

    // Parse styles from JSON column (actual names) with fallback to normalized
    let styles: string[];
    try {
      styles = row.styles ? JSON.parse(row.styles) : [];
    } catch {
      styles = (row.styles_n || '').split(/\s+/).filter(Boolean);
    }

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      styles,
      street: row.address || null,
      district: row.neighborhood || row.district_n || null,
      city: row.city,
      citySlug: row.city_slug,
      postcode: row.postcode,
      lat: row.latitude,
      lng: row.longitude,
      phone: row.phone,
      website: row.website_url,
      distanceKm,
      walkingMin,
      score,
      // Internal: used by quality gate, stripped before response
      _hasFts: row._ftsRank != null,
      _nameN: row.name_n || '',
      _cityN: row.city_n || '',
      _stylesN: row.styles_n || '',
    };
  });
}

// ── Relevance boundaries ───────────────────────────────────
// Don't show Bydgoszcz when they searched for Inowrocław.

async function applyRelevanceBoundaries(
  db: Client, scored: SearchResult[],
  lat: number | undefined, lng: number | undefined,
  citySlug: string | undefined,
  searchedPlace: string | null,
  limit: number, offset: number
): Promise<SearchResponse> {
  // If scoped to a city, no boundary logic needed — it's already filtered
  if (citySlug) {
    const capped = stripInternal(scored.slice(offset, offset + limit));
    return {
      results: capped, nearby: [], noLocalResults: capped.length === 0,
      searchedPlace, nearestCityWithSchools: null,
      totalFound: scored.length,
    };
  }

  // If no user location, skip distance-based boundaries
  if (lat == null || lng == null) {
    const capped = stripInternal(scored.slice(offset, offset + limit));
    return {
      results: capped, nearby: [], noLocalResults: capped.length === 0,
      searchedPlace, nearestCityWithSchools: null,
      totalFound: scored.length,
    };
  }

  // Split into primary (≤15km) and nearby (15-30km)
  const primary: SearchResult[] = [];
  const nearby: SearchResult[] = [];

  for (const r of scored) {
    if (r.distanceKm == null) { primary.push(r); continue; }
    if (r.distanceKm <= 15) primary.push(r);
    else if (r.distanceKm <= 30) nearby.push(r);
    // >30km: dropped entirely when we have location context
  }

  if (primary.length === 0 && nearby.length === 0) {
    const nearest = await findNearestCityWithSchools(db, lat, lng);
    return {
      results: [], nearby: [], noLocalResults: true,
      searchedPlace, nearestCityWithSchools: nearest,
      totalFound: 0,
    };
  }

  return {
    results: stripInternal(primary.slice(offset, offset + limit)),
    nearby: stripInternal(nearby.slice(0, 5)),
    noLocalResults: false, searchedPlace,
    nearestCityWithSchools: null,
    totalFound: primary.length + nearby.length,
  };
}

// ── Find nearest city with schools (for empty-state messaging) ─

async function findNearestCityWithSchools(
  db: Client, lat: number, lng: number
): Promise<{ city: string; slug: string; distanceKm: number; count: number } | null> {
  const result = await db.execute({
    sql: 'SELECT slug, name, lat, lng, school_count FROM cities WHERE school_count > 0',
    args: [],
  });
  let best: any = null;
  let bestDist = Infinity;
  for (const row of result.rows as any[]) {
    const d = haversineKm(lat, lng, row.lat, row.lng);
    if (d < bestDist) { bestDist = d; best = row; }
  }
  if (!best) return null;
  return { city: best.name, slug: best.slug, distanceKm: bestDist, count: best.school_count };
}

// ── Autocomplete ───────────────────────────────────────────

export interface AutocompleteResult {
  text: string;
  type: 'school' | 'city' | 'style' | 'district';
  slug?: string;
}

export async function autocomplete(
  db: Client, query: string, context: { page: string; citySlug?: string; styleSlug?: string },
  limit = 8
): Promise<AutocompleteResult[]> {
  const n = normalize(query);
  if (n.length < 2) return [];

  const results: AutocompleteResult[] = [];

  if (context.page === 'city' && context.citySlug) {
    // City page: schools first (most important), then styles, then districts
    await addSchoolSuggestionsInCity(db, n, context.citySlug, results);
    await addStyleSuggestionsInCity(db, n, context.citySlug, results);
    await addDistrictSuggestions(db, n, context.citySlug, results);
  } else if (context.page === 'style' && context.styleSlug) {
    // Style page: schools first, then cities
    await addSchoolsWithStyle(db, n, context.styleSlug, results);
    await addCitiesWithStyle(db, n, context.styleSlug, results);
  } else {
    // Main page: cities first, then styles, then schools
    await addCitySuggestions(db, n, results);
    await addGlobalStyleSuggestions(db, n, results);
    await addGlobalSchoolSuggestions(db, n, results);
  }

  // Deduplicate
  const seen = new Set<string>();
  return results.filter(r => {
    const key = r.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

// ── Autocomplete helpers ───────────────────────────────────

async function addCitySuggestions(db: Client, n: string, out: AutocompleteResult[]) {
  const r = await db.execute({
    sql: 'SELECT slug, name, school_count FROM cities WHERE name_n LIKE ? AND school_count > 0 ORDER BY school_count DESC LIMIT 4',
    args: [`${n}%`],
  });
  for (const row of r.rows as any[]) {
    out.push({ text: `${row.name} (${row.school_count} schools)`, type: 'city', slug: row.slug });
  }
}

async function addGlobalStyleSuggestions(db: Client, n: string, out: AutocompleteResult[]) {
  const r = await db.execute({
    sql: "SELECT slug, name FROM styles WHERE name_n LIKE ? OR aliases_n LIKE ? LIMIT 4",
    args: [`${n}%`, `%${n}%`],
  });
  for (const row of r.rows as any[]) {
    out.push({ text: row.name, type: 'style', slug: row.slug });
  }
}

async function addGlobalSchoolSuggestions(db: Client, n: string, out: AutocompleteResult[]) {
  const r = await db.execute({
    sql: 'SELECT id, slug, name, city FROM schools WHERE name_n LIKE ? LIMIT 4',
    args: [`${n}%`],
  });
  for (const row of r.rows as any[]) {
    out.push({ text: `${row.name} — ${row.city}`, type: 'school', slug: (row.slug ?? row.id) as string });
  }
}

async function addDistrictSuggestions(db: Client, n: string, citySlug: string, out: AutocompleteResult[]) {
  const r = await db.execute({
    sql: 'SELECT DISTINCT neighborhood FROM schools WHERE city_slug = ? AND district_n LIKE ? LIMIT 4',
    args: [citySlug, `${n}%`],
  });
  for (const row of r.rows as any[]) {
    if (row.neighborhood) out.push({ text: row.neighborhood, type: 'district' });
  }
}

async function addStyleSuggestionsInCity(db: Client, n: string, citySlug: string, out: AutocompleteResult[]) {
  // styles_n is space-separated normalized style names; find matching styles via the styles table
  const r = await db.execute({
    sql: `SELECT DISTINCT st.name, st.slug FROM school_styles ss
          JOIN styles st ON st.id = ss.style_id
          JOIN schools s ON s.id = ss.school_id
          WHERE s.city_slug = ? AND st.name_n LIKE ?
          LIMIT 4`,
    args: [citySlug, `${n}%`],
  });
  for (const row of r.rows as any[]) {
    out.push({ text: row.name as string, type: 'style', slug: row.slug as string });
  }
}

async function addSchoolSuggestionsInCity(db: Client, n: string, citySlug: string, out: AutocompleteResult[]) {
  const r = await db.execute({
    sql: `SELECT id, slug, name, address, neighborhood FROM schools
          WHERE city_slug = ? AND (name_n LIKE ? OR street_n LIKE ? OR district_n LIKE ?)
          LIMIT 4`,
    args: [citySlug, `%${n}%`, `%${n}%`, `%${n}%`],
  });
  for (const row of r.rows as any[]) {
    const meta = row.neighborhood || row.address || '';
    out.push({ text: row.name as string, type: 'school', slug: (row.slug ?? row.id) as string });
  }
}

async function addCitiesWithStyle(db: Client, n: string, styleSlug: string, out: AutocompleteResult[]) {
  const styleName = normalize(styleSlug.replace('-yoga', ''));
  const r = await db.execute({
    sql: `SELECT DISTINCT city, city_slug FROM schools
          WHERE styles_n LIKE ? AND city_n LIKE ?
          LIMIT 4`,
    args: [`%${styleName}%`, `${n}%`],
  });
  for (const row of r.rows as any[]) {
    out.push({ text: row.city, type: 'city', slug: row.city_slug });
  }
}

async function addSchoolsWithStyle(db: Client, n: string, styleSlug: string, out: AutocompleteResult[]) {
  const styleName = normalize(styleSlug.replace('-yoga', ''));
  const r = await db.execute({
    sql: `SELECT slug, name, city FROM schools WHERE styles_n LIKE ? AND name_n LIKE ? LIMIT 4`,
    args: [`%${styleName}%`, `${n}%`],
  });
  for (const row of r.rows as any[]) {
    out.push({ text: `${row.name} — ${row.city}`, type: 'school', slug: row.slug });
  }
}

// ── Helpers ────────────────────────────────────────────────

function toSearchResult(row: any, lat?: number, lng?: number): SearchResult {
  let distanceKm: number | null = null;
  let walkingMin: number | null = null;
  if (lat != null && lng != null && row.latitude != null && row.longitude != null) {
    distanceKm = haversineKm(lat, lng, row.latitude, row.longitude);
    walkingMin = walkingMinutes(distanceKm);
  }
  // Parse styles from JSON column (actual names) with fallback to normalized
  let styles: string[];
  try {
    styles = row.styles ? JSON.parse(row.styles) : [];
  } catch {
    styles = (row.styles_n || '').split(/\s+/).filter(Boolean);
  }
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    styles,
    street: row.address || null,
    district: row.neighborhood || row.district_n || null,
    city: row.city,
    citySlug: row.city_slug,
    postcode: row.postcode,
    lat: row.latitude,
    lng: row.longitude,
    phone: row.phone,
    website: row.website_url,
    distanceKm,
    walkingMin,
    score: 0,
  };
}

/** Strip internal quality-gate fields before sending to client */
function stripInternal(results: SearchResult[]): SearchResult[] {
  return results.map(({ _hasFts, _nameN, _cityN, _stylesN, ...rest }) => rest);
}

function deduplicateById(rows: any[]): any[] {
  const seen = new Set<string>();
  return rows.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
}

function empty(): SearchResponse {
  return { results: [], nearby: [], noLocalResults: false, searchedPlace: null, nearestCityWithSchools: null, totalFound: 0 };
}
