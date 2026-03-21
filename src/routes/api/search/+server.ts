import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { search, autocomplete } from '$lib/search';
import { client } from '$lib/server/db/index';

export const GET: RequestHandler = async ({ url }) => {
  const q = (url.searchParams.get('q') ?? '').slice(0, 200);
  const mode = url.searchParams.get('mode') ?? 'search';
  const rawLat = url.searchParams.has('lat') ? parseFloat(url.searchParams.get('lat')!) : NaN;
  const rawLng = url.searchParams.has('lng') ? parseFloat(url.searchParams.get('lng')!) : NaN;
  const lat = !isNaN(rawLat) && rawLat >= -90 && rawLat <= 90 ? rawLat : undefined;
  const lng = !isNaN(rawLng) && rawLng >= -180 && rawLng <= 180 ? rawLng : undefined;
  const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0);
  const citySlug = url.searchParams.get('citySlug') ?? undefined;
  const styleSlug = url.searchParams.get('styleSlug') ?? undefined;
  const page = url.searchParams.get('page') ?? 'main';

  try {
    if (mode === 'autocomplete') {
      const results = await autocomplete(client, q, { page, citySlug, styleSlug }, Math.min(limit, 10));
      return json({ results });
    }

    const response = await search(client, { query: q, citySlug, styleSlug, lat, lng, limit, offset });
    return json(response);
  } catch (err) {
    console.error('Search error:', err);
    return json({ error: 'Search failed' }, { status: 500 });
  }
};
