import { error } from '@sveltejs/kit';
import { getListingById, getReviewsBySchoolId } from '$lib/server/db/queries/index';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, request }) => {
  const listing = await getListingById(params.id);

  if (!listing) {
    throw error(404, 'Nie znaleziono szkoły');
  }

  const reviews = await getReviewsBySchoolId(params.id);

  // Extract preferred languages from Accept-Language header (e.g. "pl,en-US;q=0.9,en;q=0.8")
  const acceptLang = request.headers.get('accept-language') ?? 'pl';
  const preferredLangs = acceptLang
    .split(',')
    .map(part => part.split(';')[0].trim().split('-')[0].toLowerCase())
    .filter(Boolean);

  return {
    listing,
    reviews,
    preferredLangs,
  };
};
