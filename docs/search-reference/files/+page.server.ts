// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { loadResolverLookups } from '$lib/search';

export const load: PageServerLoad = async () => {
  const lookups = await loadResolverLookups(db);

  // Top cities for browse section
  const citiesResult = await db.execute(
    'SELECT slug, name, school_count FROM cities WHERE school_count > 0 ORDER BY school_count DESC LIMIT 12'
  );
  const topCities = (citiesResult.rows as any[]).map(r => ({
    slug: r.slug, name: r.name, schoolCount: r.school_count,
  }));

  // All styles for browse section
  const stylesResult = await db.execute(
    'SELECT slug, name FROM styles ORDER BY school_count DESC'
  );
  const styles = (stylesResult.rows as any[]).map(r => ({ slug: r.slug, name: r.name }));

  return { lookups, topCities, styles };
};
