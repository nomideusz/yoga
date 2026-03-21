// ============================================================
// src/lib/search/engine.ts — Yoga search engine
// ============================================================
// Uses @nomideusz/svelte-search's createSearchEngine with yoga's schema adapter.

import type { Client } from '@libsql/client';
import { createSearchEngine, type SchemaAdapter, type SearchParams as BaseSearchParams, type SearchResponse, type SearchResult as BaseSearchResult, type DatabaseClient } from '@nomideusz/svelte-search';
import { plLocale } from '@nomideusz/svelte-search/locales/pl';
import { haversineKm, walkingMinutes, normalize } from '@nomideusz/svelte-search';

/** Yoga search params — backward compat with citySlug/styleSlug */
export interface SearchParams extends Omit<BaseSearchParams, 'locationSlug' | 'categorySlug'> {
  citySlug?: string;
  styleSlug?: string;
}

// ── Yoga-specific result type ──────────────────────────────

export interface SearchResult extends BaseSearchResult {
  styles: string[];
  street: string | null;
  district: string | null;
  city: string;
  citySlug: string;
  postcode: string | null;
  phone: string | null;
  website: string | null;
}

// ── Schema adapter ─────────────────────────────────────────

const yogaAdapter: SchemaAdapter<SearchResult> = {
  tables: {
    entities: 'schools',
    trigrams: 'school_trigrams',
    fts: 'schools_fts',
    synonyms: 'search_synonyms',
  },
  columns: {
    id: 'id',
    name: 'name',
    nameNormalized: 'name_n',
    slug: 'slug',
    lat: 'latitude',
    lng: 'longitude',
    locationSlug: 'city_slug',
    categoriesNormalized: 'styles_n',
    locationNormalized: 'city_n',
    areaNormalized: 'district_n',
  },
  trigramColumns: {
    trigram: 'trigram',
    entityId: 'school_id',
    field: 'field',
  },
  toResult(row: Record<string, unknown>, lat?: number, lng?: number): SearchResult {
    let distanceKm: number | null = null;
    let walkingMin: number | null = null;
    if (lat != null && lng != null && row.latitude != null && row.longitude != null) {
      distanceKm = haversineKm(lat, lng, row.latitude as number, row.longitude as number);
      walkingMin = walkingMinutes(distanceKm);
    }
    let styles: string[];
    try {
      styles = row.styles ? JSON.parse(row.styles as string) : [];
    } catch {
      styles = ((row.styles_n as string) || '').split(/\s+/).filter(Boolean);
    }
    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      styles,
      street: (row.address as string) || null,
      district: (row.neighborhood as string) || (row.district_n as string) || null,
      city: row.city as string,
      citySlug: row.city_slug as string,
      postcode: (row.postcode as string) || null,
      lat: (row.latitude as number) || null,
      lng: (row.longitude as number) || null,
      phone: (row.phone as string) || null,
      website: (row.website_url as string) || null,
      distanceKm,
      walkingMin,
      score: 0,
      _hasFts: (row._ftsRank as number | null) != null,
      _nameN: (row.name_n as string) || '',
      _locationN: (row.city_n as string) || '',
      _categoriesN: (row.styles_n as string) || '',
    };
  },
  trigramFields(entity: Record<string, unknown>) {
    const styles: string[] = (() => { try { return JSON.parse((entity.styles as string) || '[]'); } catch { return []; } })();
    return [
      { text: entity.name as string, field: 'name' },
      { text: entity.city as string, field: 'city' },
      { text: entity.neighborhood as string, field: 'district' },
      { text: entity.address as string, field: 'street' },
      ...styles.map(s => ({ text: s, field: 'style' })),
    ];
  },
};

// ── Adapt libsql Client to DatabaseClient ──────────────────

function wrapClient(client: Client): DatabaseClient {
  return {
    execute(query) {
      if (typeof query === 'string') {
        return client.execute(query) as Promise<any>;
      }
      return client.execute({ sql: query.sql, args: query.args as any }) as Promise<any>;
    },
  };
}

// ── Cached engine per client ───────────────────────────────

let _engine: ReturnType<typeof createSearchEngine<SearchResult>> | null = null;
let _engineClient: Client | null = null;

function getEngine(client: Client) {
  if (_engine && _engineClient === client) return _engine;
  _engine = createSearchEngine<SearchResult>({
    db: wrapClient(client),
    adapter: yogaAdapter,
    locale: plLocale,
  });
  _engineClient = client;
  return _engine;
}

// ── Public API (same signature as before) ──────────────────

export async function search(db: Client, params: SearchParams): Promise<SearchResponse<SearchResult>> {
  const { citySlug, styleSlug, ...rest } = params;
  return getEngine(db).search({
    ...rest,
    locationSlug: citySlug,
    categorySlug: styleSlug,
  });
}

// ── Autocomplete (yoga-specific — page-context-aware) ──────
// This stays here because autocomplete query logic is tightly coupled
// to yoga's entity model (schools, styles, districts, cities).

export interface AutocompleteResult {
  text: string;
  type: 'school' | 'city' | 'style' | 'district';
  slug?: string;
}

export async function autocomplete(
  db: Client, query: string, context: { page: string; citySlug?: string; styleSlug?: string },
  limit = 8
): Promise<AutocompleteResult[]> {
  const n = normalize(query, plLocale);
  if (n.length < 2) return [];

  const results: AutocompleteResult[] = [];

  if (context.page === 'city' && context.citySlug) {
    await addSchoolSuggestionsInCity(db, n, context.citySlug, results);
    await addStyleSuggestionsInCity(db, n, context.citySlug, results);
    await addDistrictSuggestions(db, n, context.citySlug, results);
  } else if (context.page === 'style' && context.styleSlug) {
    await addSchoolsWithStyle(db, n, context.styleSlug, results);
    await addCitiesWithStyle(db, n, context.styleSlug, results);
  } else {
    await addCitySuggestions(db, n, results);
    await addGlobalStyleSuggestions(db, n, results);
    await addGlobalSchoolSuggestions(db, n, results);
  }

  const seen = new Set<string>();
  return results.filter(r => {
    const key = r.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

// ── Autocomplete helpers (yoga-specific SQL) ───────────────

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
    out.push({ text: row.name as string, type: 'style', slug: row.slug as string });
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
    if (row.neighborhood) out.push({ text: row.neighborhood as string, type: 'district' });
  }
}

async function addStyleSuggestionsInCity(db: Client, n: string, citySlug: string, out: AutocompleteResult[]) {
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
    out.push({ text: row.name as string, type: 'school', slug: (row.slug ?? row.id) as string });
  }
}

async function addCitiesWithStyle(db: Client, n: string, styleSlug: string, out: AutocompleteResult[]) {
  const styleName = normalize(styleSlug.replace('-yoga', ''), plLocale);
  const r = await db.execute({
    sql: `SELECT DISTINCT city, city_slug FROM schools
          WHERE styles_n LIKE ? AND city_n LIKE ?
          LIMIT 4`,
    args: [`%${styleName}%`, `${n}%`],
  });
  for (const row of r.rows as any[]) {
    out.push({ text: row.city as string, type: 'city', slug: row.city_slug as string });
  }
}

async function addSchoolsWithStyle(db: Client, n: string, styleSlug: string, out: AutocompleteResult[]) {
  const styleName = normalize(styleSlug.replace('-yoga', ''), plLocale);
  const r = await db.execute({
    sql: `SELECT slug, name, city FROM schools WHERE styles_n LIKE ? AND name_n LIKE ? LIMIT 4`,
    args: [`%${styleName}%`, `${n}%`],
  });
  for (const row of r.rows as any[]) {
    out.push({ text: `${row.name} — ${row.city}`, type: 'school', slug: row.slug as string });
  }
}

export { yogaAdapter, wrapClient };
