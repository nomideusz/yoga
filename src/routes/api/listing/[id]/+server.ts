import { json, error } from '@sveltejs/kit';
import { getListingById, getSchoolTranslation } from '$lib/server/db/queries/index';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const listing = await getListingById(params.id);
  if (!listing) throw error(404, 'Not found');

  const [translationEn, translationUk] = await Promise.all([
    getSchoolTranslation(params.id, 'en'),
    getSchoolTranslation(params.id, 'uk'),
  ]);

  return json({
    ...listing,
    translations: {
      en: translationEn,
      uk: translationUk,
    },
  });
};
