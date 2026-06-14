import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import {
	getListingById,
	getSchoolTranslation,
	getReviewsBySchoolId
} from '$lib/server/db/queries/index';

/** Full listing by id (with en/uk translations) — replaces `GET /api/listing/[id]`. */
export const listing = query('unchecked', async (id: string) => {
	const row = await getListingById(id);
	if (!row) throw error(404, 'Not found');
	const [en, uk] = await Promise.all([
		getSchoolTranslation(id, 'en'),
		getSchoolTranslation(id, 'uk')
	]);
	return { ...row, translations: { en, uk } };
});

/** Reviews for a listing — replaces `GET /api/listing/[id]/reviews`. */
export const listingReviews = query('unchecked', (id: string) => getReviewsBySchoolId(id));
