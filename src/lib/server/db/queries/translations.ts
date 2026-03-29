import { db } from '../index';
import { schoolTranslations, cityTranslations } from '../schema';
import { eq, and, sql } from 'drizzle-orm';
import type { Listing } from './types';

// ── School translations ─────────────────────────────────────────────────────

export interface SchoolTranslationData {
  schoolId: string;
  locale: string;
  description: string;
  editorialSummary: string;
  pricingNotes: string;
}

/** Get translations for a single school */
export async function getSchoolTranslation(
  schoolId: string,
  locale: string,
): Promise<SchoolTranslationData | null> {
  if (locale === 'pl') return null; // Polish is the source language
  
  const [row] = await db
    .select()
    .from(schoolTranslations)
    .where(
      and(
        eq(schoolTranslations.schoolId, schoolId),
        eq(schoolTranslations.locale, locale),
      ),
    )
    .limit(1);

  if (!row) return null;
  return {
    schoolId: row.schoolId,
    locale: row.locale,
    description: row.description ?? '',
    editorialSummary: row.editorialSummary ?? '',
    pricingNotes: row.pricingNotes ?? '',
  };
}

/** Get translations for multiple schools (batch) */
export async function getSchoolTranslations(
  schoolIds: string[],
  locale: string,
): Promise<Map<string, SchoolTranslationData>> {
  if (locale === 'pl' || schoolIds.length === 0) return new Map();

  const idsSql = sql.join(
    schoolIds.map((id) => sql`${id}`),
    sql`, `,
  );

  const rows = await db
    .select()
    .from(schoolTranslations)
    .where(
      and(
        sql`${schoolTranslations.schoolId} IN (${idsSql})`,
        eq(schoolTranslations.locale, locale),
      ),
    );

  const map = new Map<string, SchoolTranslationData>();
  for (const row of rows) {
    map.set(row.schoolId, {
      schoolId: row.schoolId,
      locale: row.locale,
      description: row.description ?? '',
      editorialSummary: row.editorialSummary ?? '',
      pricingNotes: row.pricingNotes ?? '',
    });
  }
  return map;
}

/** Apply translation to a listing (mutates in place for perf) */
export function applyTranslation(
  listing: Listing,
  translation: SchoolTranslationData | null,
): Listing {
  if (!translation) return listing;
  return {
    ...listing,
    description: translation.description || listing.description,
    editorialSummary: translation.editorialSummary || listing.editorialSummary,
    pricingNotes: translation.pricingNotes || listing.pricingNotes,
  };
}

// ── City translations ───────────────────────────────────────────────────────

export interface CityTranslationData {
  slug: string;
  locale: string;
  name: string;
  nameLoc: string | null;
}

/** Get all city translations for a locale */
export async function getCityTranslations(
  locale: string,
): Promise<Map<string, CityTranslationData>> {
  if (locale === 'pl') return new Map();

  const rows = await db
    .select()
    .from(cityTranslations)
    .where(eq(cityTranslations.locale, locale));

  const map = new Map<string, CityTranslationData>();
  for (const row of rows) {
    map.set(row.slug, {
      slug: row.slug,
      locale: row.locale,
      name: row.name,
      nameLoc: row.nameLoc,
    });
  }
  return map;
}

/** Get translation for a single city */
export async function getCityTranslation(
  slug: string,
  locale: string,
): Promise<CityTranslationData | null> {
  if (locale === 'pl') return null;

  const [row] = await db
    .select()
    .from(cityTranslations)
    .where(
      and(
        eq(cityTranslations.slug, slug),
        eq(cityTranslations.locale, locale),
      ),
    )
    .limit(1);

  if (!row) return null;
  return {
    slug: row.slug,
    locale: row.locale,
    name: row.name,
    nameLoc: row.nameLoc,
  };
}
