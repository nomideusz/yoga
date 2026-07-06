import type { PageServerLoad } from './$types';
import { like, or, sql, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { schools } from '$lib/server/db/schema';
import { normalize, plLocale } from '$lib/search';

const COLS = {
  id: schools.id,
  name: schools.name,
  city: schools.city,
  citySlug: schools.citySlug,
  slug: schools.slug,
  isListed: schools.isListed,
  scrapeLocked: schools.scrapeLocked,
};

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';

  let rows;
  if (q) {
    const n = `%${normalize(q, plLocale)}%`;
    rows = await db
      .select(COLS)
      .from(schools)
      .where(or(like(schools.nameN, n), like(schools.cityN, n), like(schools.id, n)))
      .orderBy(asc(schools.city), asc(schools.name))
      .limit(100);
  } else {
    // Default view: protected/claimed schools first, then nothing else — search for the rest.
    rows = await db
      .select(COLS)
      .from(schools)
      .where(eq(schools.scrapeLocked, true))
      .orderBy(asc(schools.city), asc(schools.name))
      .limit(100);
  }

  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(schools);
  return { q, rows, total };
};
