import { error, redirect } from "@sveltejs/kit";
import { getListingsByStyle } from "$lib/server/db/queries/index";
import { normalize } from "$lib/search";
import { STYLES_METADATA } from "$lib/styles-metadata";
import { localizeHref } from "@nomideusz/svelte-i18n";
import { i18nRouting } from "$lib/i18n-routing";
import { CDN_CACHE_HEADER } from "$lib/server/cdn-cache";
import { getCanonicalStyleSlug, SEO_PAGE_SIZE } from "$lib/seo";
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

export const load: PageServerLoad = async ({ params, url, parent, locals, setHeaders }) => {
  setHeaders(CDN_CACHE_HEADER);
  const slug = params.slug;
  const parentData = await parent();
  const lookups = parentData.lookups;

  const replacementSlug = getCanonicalStyleSlug(slug);
  if (replacementSlug !== slug) {
    throw redirect(
      301,
      localizeHref(`/category/${replacementSlug}${url.search}`, locals.locale, i18nRouting),
    );
  }

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
    throw redirect(
      301,
      localizeHref(`/category/${canonicalSlug}${url.search}`, locals.locale, i18nRouting),
    );
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

  const pageParam = url.searchParams.get("page");
  const page = pageParam && /^[1-9]\d*$/.test(pageParam) ? Number(pageParam) : 1;
  const totalPages = Math.max(1, Math.ceil(listings.length / SEO_PAGE_SIZE));

  if ((pageParam && !/^[1-9]\d*$/.test(pageParam)) || page > totalPages) {
    throw error(404, "Nie znaleziono takiej strony wyników.");
  }

  if (pageParam && page === 1) {
    throw redirect(
      301,
      localizeHref(`/category/${canonicalSlug}`, locals.locale, i18nRouting),
    );
  }

  return {
    slug: canonicalSlug,
    styleName,
    listings,
    page,
    metadata,
    lookups,
  };
};
