import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { search, autocomplete } from '$lib/search';
import { client } from '$lib/server/db/index';

export const GET: RequestHandler = async ({ url }) => {
  const q = url.searchParams.get('q') ?? '';
  const mode = url.searchParams.get('mode') ?? 'search';
  const lat = url.searchParams.has('lat') ? parseFloat(url.searchParams.get('lat')!) : undefined;
  const lng = url.searchParams.has('lng') ? parseFloat(url.searchParams.get('lng')!) : undefined;
  const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '20', 10));
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
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
