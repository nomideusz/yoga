import { getListingsByStyle } from '$lib/server/db/queries/index';
import { STYLES_METADATA } from '$lib/styles-metadata';
import { loadResolverLookups } from '$lib/search';
import { client } from '$lib/server/db/index';

export async function load({ params }) {
  const slug = params.slug;
  // Convert URL slug back to style name (e.g. "power-yoga" → "power yoga")
  const styleName = slug.replace(/-/g, ' ');
  const listings = await getListingsByStyle(styleName);
  const metadata = STYLES_METADATA[styleName.toLowerCase()];
  const lookups = await loadResolverLookups(client);

  return {
    slug,
    styleName,
    listings,
    metadata,
    lookups,
  };
}
