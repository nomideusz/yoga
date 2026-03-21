import { error, redirect } from "@sveltejs/kit";
import { getListingsByStyle } from "$lib/server/db/queries/index";
import { normalize } from "$lib/search";
import { STYLES_METADATA } from "$lib/styles-metadata";
import type { PageServerLoad } from "./$types";

function slugToStyleName(slug: string): string {
  return slug.replace(/-/g, " ");
}

function metadataStyleNameFromSlug(slug: string): string | null {
  const normalized = normalize(slugToStyleName(slug));

  for (const [key, metadata] of Object.entries(STYLES_METADATA)) {
    if (normalize(key) === normalized) return key;
    if (normalize(metadata.displayName) === normalized) return key;
  }

  return null;
}

export const load: PageServerLoad = async ({ params, parent }) => {
  const slug = params.slug;
  const parentData = await parent();
  const lookups = parentData.lookups;

  const normalizedSlug = normalize(slugToStyleName(params.slug));
  const mappedSlug = lookups.styleMap.get(normalizedSlug);

  // Determine canonical slug: if styleMap maps to a different slug,
  // only redirect when the current slug isn't itself a known style slug.
  // This prevents "yin" being redirected to "yin-restorative" when both exist.
  const isCurrentSlugKnown = [...lookups.styleMap.values()].includes(params.slug);
  const canonicalSlug = (mappedSlug && mappedSlug !== params.slug && !isCurrentSlugKnown)
    ? mappedSlug
    : params.slug;

  if (canonicalSlug !== params.slug) {
    throw redirect(301, `/category/${canonicalSlug}`);
  }

  const fallbackMetadataStyleName = metadataStyleNameFromSlug(canonicalSlug);
  const styleName = fallbackMetadataStyleName ?? slugToStyleName(canonicalSlug);
  const listings = await getListingsByStyle(styleName, canonicalSlug);
  const metadata =
    STYLES_METADATA[styleName.toLowerCase()] ??
    STYLES_METADATA[normalizedSlug] ??
    (fallbackMetadataStyleName
      ? STYLES_METADATA[fallbackMetadataStyleName]
      : undefined);

  if (listings.length === 0) {
    throw error(404, "Nie znaleziono takiego stylu jogi.");
  }

  return {
    slug: canonicalSlug,
    styleName,
    listings,
    metadata,
    lookups,
  };
};
