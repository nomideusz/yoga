// src/routes/[styleSlug]-yoga/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { loadResolverLookups, normalize } from '$lib/search';

export const load: PageServerLoad = async ({ params }) => {
  const { styleSlug } = params;
  const fullSlug = `${styleSlug}-yoga`;

  // Load style
  const styleResult = await db.execute({
    sql: 'SELECT * FROM styles WHERE slug = ?', args: [fullSlug],
  });
  if (styleResult.rows.length === 0) throw error(404, 'Style not found');
  const style = styleResult.rows[0] as any;

  // Load all schools with this style
  const styleName = normalize(styleSlug);
  const schoolsResult = await db.execute({
    sql: "SELECT * FROM schools WHERE styles_n LIKE ? ORDER BY city, name",
    args: [`%${styleName}%`],
  });
  const allSchools = (schoolsResult.rows as any[]).map(r => ({
    id: r.id, name: r.name, slug: r.slug,
    styles: JSON.parse(r.styles || '[]'),
    street: r.street, district: r.district,
    city: r.city, citySlug: r.city_slug,
    postcode: r.postcode, lat: r.lat, lng: r.lng,
    phone: r.phone, website: r.website,
    distanceKm: null, walkingMin: null, score: 0,
  }));

  const lookups = await loadResolverLookups(db);

  return {
    style: {
      slug: fullSlug, name: style.name,
      descriptionHtml: style.description ?? '',
    },
    allSchools,
    lookups,
  };
};
