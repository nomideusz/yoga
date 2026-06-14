import { query } from '$app/server';
import { search } from '$lib/search';
import { client } from '$lib/server/db/index';
import { getAutocompleteIndex } from '$lib/server/db/queries/index';

export interface SearchArgs {
	q: string;
	citySlug?: string;
	limit?: number;
}

/**
 * School search — replaces `GET /api/search` (search mode). Clients only ever
 * used `q` / `citySlug` / `limit`, so the unused `autocomplete`/`lat`/`lng`/
 * `offset`/`styleSlug` params are dropped. Returns the SearchResponse; callers
 * read `.results`.
 */
export const searchSchools = query('unchecked', async (args: SearchArgs) => {
	const q = (args.q ?? '').slice(0, 200);
	const limit = Math.max(1, Math.min(50, args.limit ?? 20));
	return search(client, { query: q, citySlug: args.citySlug, limit, offset: 0 });
});

/** Autocomplete index — replaces `GET /api/search/index` (zero-arg read). */
export const searchIndex = query(() => getAutocompleteIndex());
