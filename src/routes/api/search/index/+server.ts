import { json } from '@sveltejs/kit';
import { getAutocompleteIndex } from '$lib/server/db/queries/index';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const index = await getAutocompleteIndex();

	return json(index, {
		headers: {
			'Cache-Control': 'public, max-age=300'
		}
	});
};
