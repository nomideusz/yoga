import { json } from '@sveltejs/kit';
import { getReviewsBySchoolId } from '$lib/server/db/queries/index';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const reviews = await getReviewsBySchoolId(params.id);
  return json(reviews);
};
