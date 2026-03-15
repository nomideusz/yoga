import { getListingsByStyle } from '$lib/server/db/queries/index';
import { STYLES_METADATA } from '$lib/styles-metadata';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
  const slug = params.slug;
  // Convert URL slug back to style name (e.g. "power-yoga" → "power yoga")
  const styleName = slug.replace(/-/g, ' ');

  const [listings, parentData] = await Promise.all([
    getListingsByStyle(styleName),
    parent(),
  ]);
  const metadata = STYLES_METADATA[styleName.toLowerCase()];
  const lookups = parentData.lookups;

  return {
    slug,
    styleName,
    listings,
    metadata,
    lookups,
  };
};
