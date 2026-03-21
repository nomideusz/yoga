import { json, error } from '@sveltejs/kit';
import { getListingById } from '$lib/server/db/queries/index';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const listing = await getListingById(params.id);
  if (!listing) throw error(404, 'Not found');
  return json(listing);
};
