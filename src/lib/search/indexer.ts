// ============================================================
// src/lib/search/indexer.ts — Yoga indexer adapter
// ============================================================
// Uses @nomideusz/svelte-search's createIndexer and createLookupsLoader
// with yoga's schema.

import type { Client } from '@libsql/client';
import { createIndexer, createLookupsLoader, normalize } from '@nomideusz/svelte-search';
import { plLocale } from '@nomideusz/svelte-search/locales/pl';
import { yogaAdapter, wrapClient } from './engine';
import type { YogaResolverLookups } from './types';

// ── Cached indexer ─────────────────────────────────────────

let _indexer: ReturnType<typeof createIndexer> | null = null;
let _indexerClient: Client | null = null;

function getIndexer(client: Client) {
  if (_indexer && _indexerClient === client) return _indexer;
  _indexer = createIndexer({
    db: wrapClient(client),
    adapter: yogaAdapter,
    locale: plLocale,
  });
  _indexerClient = client;
  return _indexer;
}

// ── Delegated operations ───────────────────────────────────

export async function reindexAllTrigrams(db: Client): Promise<number> {
  return getIndexer(db).reindexAllTrigrams();
}

export async function rebuildFts(db: Client): Promise<void> {
  return getIndexer(db).rebuildFts();
}

export async function checkFtsSync(db: Client): Promise<{
  inSchools: number; inFts: number; missingFromFts: number; orphanedInFts: number;
}> {
  const result = await getIndexer(db).checkFtsSync();
  return {
    inSchools: result.inEntities,
    inFts: result.inFts,
    missingFromFts: result.missingFromFts,
    orphanedInFts: result.orphanedInFts,
  };
}

export async function renormalizeAll(db: Client): Promise<number> {
  // Styles live in the school_styles join table (schools has no styles column);
  // city slugs come from the cities table. Prefetch both.
  const [styleRows, cityRows] = await Promise.all([
    db.execute('SELECT ss.school_id, st.name FROM school_styles ss JOIN styles st ON st.id = ss.style_id'),
    db.execute('SELECT name_n, slug FROM cities'),
  ]);
  const stylesBySchool = new Map<string, string[]>();
  for (const row of styleRows.rows as any[]) {
    const arr = stylesBySchool.get(row.school_id as string) ?? [];
    arr.push(row.name as string);
    stylesBySchool.set(row.school_id as string, arr);
  }
  const citySlugByNameN = new Map<string, string>();
  for (const row of cityRows.rows as any[]) citySlugByNameN.set(row.name_n as string, row.slug as string);

  // Full rebuild semantics: school_trigrams has no unique index, so
  // re-indexing without clearing would duplicate rows and skew match counts.
  await db.execute('DELETE FROM school_trigrams');

  return getIndexer(db).renormalizeAll(async (wrappedDb, row) => {
    const styles = stylesBySchool.get(row.id as string) ?? [];
    // Patch the row so the indexer's trigramFields sees styles too
    row.styles = JSON.stringify(styles);

    const cityN = normalize((row.city as string) || '', plLocale);
    const citySlug = (row.city_slug as string)
      || citySlugByNameN.get(cityN)
      || cityN.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = (row.slug as string) || (citySlug ? `${row.id}-${citySlug}` : (row.id as string));
    const postcode = (row.postcode as string)
      || ((row.address as string) || '').match(/\b\d{2}-\d{3}\b/)?.[0]
      || null;

    await wrappedDb.execute({
      sql: `UPDATE schools SET name_n=?, city_n=?, street_n=?, district_n=?, description_n=?, styles_n=?, city_slug=?, slug=?, postcode=?
            WHERE id=?`,
      args: [
        normalize((row.name as string) || '', plLocale),
        cityN,
        normalize((row.address as string) || '', plLocale),
        normalize((row.neighborhood as string) || '', plLocale),
        normalize((row.description as string) || '', plLocale),
        styles.map(s => normalize(s, plLocale)).join(' '),
        citySlug, slug, postcode,
        row.id,
      ],
    });
  });
}

// ── Resolver lookups loader ────────────────────────────────

const _lookupsLoader = new WeakMap<Client, ReturnType<typeof createLookupsLoader>>();

function getLookupsLoader(client: Client) {
  let loader = _lookupsLoader.get(client);
  if (loader) return loader;
  loader = createLookupsLoader({
    db: wrapClient(client),
    locale: plLocale,
    locations: {
      sql: 'SELECT slug, name, name_n, name_loc, school_count, lat, lng FROM cities',
      slugCol: 'slug',
      nameNormalizedCol: 'name_n',
      countCol: 'school_count',
      latCol: 'lat',
      lngCol: 'lng',
      nameCol: 'name',
    },
    categories: {
      sql: 'SELECT slug, name_n, aliases_n FROM styles',
      slugCol: 'slug',
      nameNormalizedCol: 'name_n',
      aliasesNormalizedCol: 'aliases_n',
    },
    areas: {
      sql: 'SELECT slug, districts FROM cities',
      locationSlugCol: 'slug',
      areasJsonCol: 'districts',
    },
    synonymsSql: "SELECT alias, canonical, category FROM search_synonyms",
  });
  _lookupsLoader.set(client, loader);
  return loader;
}

export async function loadResolverLookups(db: Client): Promise<YogaResolverLookups> {
  const base = await getLookupsLoader(db).load();

  // Load cityLocative (yoga-specific — not in generic package)
  const cityLocative = new Map<string, string>();
  const locRows = await db.execute({
    sql: 'SELECT name, name_loc FROM cities WHERE name_loc IS NOT NULL',
    args: [],
  });
  for (const row of locRows.rows as any[]) {
    if (row.name_loc) cityLocative.set(row.name, row.name_loc);
  }

  return {
    ...base,
    // Yoga-specific aliases pointing to the same maps
    cityMap: base.locationMap,
    styleMap: base.categoryMap,
    citySchoolCount: base.locationEntityCount,
    cityGeo: base.locationGeo,
    cityLocative,
  };
}
