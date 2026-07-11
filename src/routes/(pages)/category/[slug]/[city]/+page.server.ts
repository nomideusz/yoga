import { error, redirect } from "@sveltejs/kit";
import { getListingsByStyle, getUniqueCities } from "$lib/server/db/queries/index";
import { normalize } from "$lib/search";
import { STYLES_METADATA } from "$lib/styles-metadata";
import {
  getCanonicalStyleSlug,
  MIN_STYLE_CITY_LISTINGS,
  SEO_PAGE_SIZE,
} from "$lib/seo";
import { localizeHref } from "@nomideusz/svelte-i18n";
import { i18nRouting } from "$lib/i18n-routing";
import { CDN_CACHE_HEADER } from "$lib/server/cdn-cache";
import type { PageServerLoad } from "./$types";

function slugToName(slug: string): string {
  return slug.replace(/-/g, " ");
}

function metadataName(slug: string): string | null {
  const normalized = normalize(slugToName(slug));

  for (const [key, metadata] of Object.entries(STYLES_METADATA)) {
    if (normalize(key) === normalized || normalize(metadata.displayName) === normalized) {
      return key;
    }
  }

  return null;
}

export const load: PageServerLoad = async ({
  params,
  url,
  parent,
  locals,
  setHeaders,
}) => {
  setHeaders(CDN_CACHE_HEADER);
  const parentData = await parent();
  const lookups = parentData.lookups;

  const replacementSlug = getCanonicalStyleSlug(params.slug);
  if (replacementSlug !== params.slug) {
    throw redirect(
      301,
      localizeHref(
        `/category/${replacementSlug}/${params.city}${url.search}`,
        locals.locale,
        i18nRouting,
      ),
    );
  }

  const normalizedStyleSlug = normalize(slugToName(params.slug));
  const mappedStyleSlug = lookups.styleMap.get(normalizedStyleSlug);
  const isCurrentStyleSlug = [...lookups.styleMap.values()].includes(params.slug);
  const styleSlug =
    mappedStyleSlug && mappedStyleSlug !== params.slug && !isCurrentStyleSlug
      ? mappedStyleSlug
      : params.slug;

  if (styleSlug !== params.slug) {
    throw redirect(
      301,
      localizeHref(
        `/category/${styleSlug}/${params.city}${url.search}`,
        locals.locale,
        i18nRouting,
      ),
    );
  }

  const requestedCityNorm = normalize(params.city.replace(/-/g, " "));
  const canonicalCitySlug = lookups.cityMap.get(requestedCityNorm);
  const allCities = await getUniqueCities();
  const cityName =
    (canonicalCitySlug ? lookups.cityGeo?.get(canonicalCitySlug)?.name : null) ??
    allCities.find((city) => normalize(city) === requestedCityNorm);

  if (!cityName) {
    throw error(404, "Nie znaleziono takiego miasta w naszej bazie.");
  }

  const citySlug =
    canonicalCitySlug ??
    lookups.cityMap.get(normalize(cityName)) ??
    params.city.toLowerCase();

  if (citySlug !== params.city) {
    throw redirect(
      301,
      localizeHref(
        `/category/${params.slug}/${citySlug}${url.search}`,
        locals.locale,
        i18nRouting,
      ),
    );
  }

  const styleKey = metadataName(styleSlug);
  const styleName = styleKey ?? slugToName(styleSlug);
  const listings = (await getListingsByStyle(styleName, styleSlug)).filter(
    (listing) =>
      listing.citySlug === citySlug || normalize(listing.city) === normalize(cityName),
  );

  if (listings.length < MIN_STYLE_CITY_LISTINGS) {
    throw error(404, "Za mało szkół dla tej kombinacji miasta i stylu.");
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
      localizeHref(
        `/category/${styleSlug}/${citySlug}`,
        locals.locale,
        i18nRouting,
      ),
    );
  }

  return {
    slug: styleSlug,
    styleName,
    city: cityName,
    citySlug,
    listings,
    page,
    metadata: styleKey ? STYLES_METADATA[styleKey] : undefined,
  };
};
