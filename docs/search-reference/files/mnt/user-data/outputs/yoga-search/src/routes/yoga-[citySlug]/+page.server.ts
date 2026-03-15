// src/routes/yoga-[citySlug]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { loadResolverLookups } from '$lib/search';

export const load: PageServerLoad = async ({ params }) => {
  const { citySlug } = params;

  // Load city
  const cityResult = await db.execute({
    sql: 'SELECT * FROM cities WHERE slug = ?', args: [citySlug],
  });
  if (cityResult.rows.length === 0) throw error(404, 'City not found');
  const city = cityResult.rows[0] as any;

  // Load all schools in this city (default view)
  const schoolsResult = await db.execute({
    sql: 'SELECT * FROM schools WHERE city_slug = ? ORDER BY name', args: [citySlug],
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
    city: { slug: city.slug, name: city.name, lat: city.lat, lng: city.lng },
    allSchools,
    lookups,
  };
};
