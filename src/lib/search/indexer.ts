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

// ── Types ──────────────────────────────────────────────────

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

// ── Insert a school ────────────────────────────────────────

function makeSlug(name: string, city: string): string {
  const base = normalize(`${name} ${city}`, plLocale).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function insertSchool(db: Client, input: SchoolInput): Promise<number> {
  const slug = makeSlug(input.name, input.city);
  const stylesJson = JSON.stringify(input.styles);
  const stylesNorm = input.styles.map(s => normalize(s, plLocale)).join(' ');

  const result = await db.execute({
    sql: `INSERT INTO schools (
      name, name_n, slug, styles, styles_n,
      street, street_n, district, district_n,
      city, city_n, city_slug, voivodeship, voivodeship_n,
      postcode, lat, lng, phone, email, website, description, description_n
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      input.name, normalize(input.name, plLocale), slug, stylesJson, stylesNorm,
      input.street ?? null, normalize(input.street ?? '', plLocale),
      input.district ?? null, normalize(input.district ?? '', plLocale),
      input.city, normalize(input.city, plLocale), input.citySlug,
      input.voivodeship ?? null, normalize(input.voivodeship ?? '', plLocale),
      input.postcode ?? null, input.lat ?? null, input.lng ?? null,
      input.phone ?? null, input.email ?? null, input.website ?? null,
      input.description ?? null, normalize(input.description ?? '', plLocale),
    ],
  });

  const schoolId = Number(result.lastInsertRowid);
  // Index trigrams via the generic indexer
  await getIndexer(db).indexTrigrams(schoolId, {
    name: input.name,
    styles: JSON.stringify(input.styles),
    city: input.city,
    neighborhood: input.district,
    address: input.street,
    city_slug: input.citySlug,
    voivodeship: input.voivodeship,
  });
  return schoolId;
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
  return getIndexer(db).renormalizeAll(async (wrappedDb, row) => {
    const styles: string[] = (() => { try { return JSON.parse((row.styles as string) || '[]'); } catch { return []; } })();
    await wrappedDb.execute({
      sql: `UPDATE schools SET name_n=?, city_n=?, street_n=?, district_n=?, voivodeship_n=?, description_n=?, styles_n=?
            WHERE id=?`,
      args: [
        normalize((row.name as string) || '', plLocale),
        normalize((row.city as string) || '', plLocale),
        normalize((row.address as string) || '', plLocale),
        normalize((row.neighborhood as string) || '', plLocale),
        normalize((row.voivodeship as string) || '', plLocale),
        normalize((row.description as string) || '', plLocale),
        styles.map(s => normalize(s, plLocale)).join(' '),
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
