import { error, redirect } from "@sveltejs/kit";
import {
  getListingsByCity,
  getUniqueCities,
  getCityIntro,
} from "$lib/server/db/queries/index";
import { normalize } from "$lib/search";
import { localizeHref } from "@nomideusz/svelte-i18n";
import { i18nRouting } from "$lib/i18n-routing";
import { SEO_PAGE_SIZE } from "$lib/seo";
import { CDN_CACHE_HEADER } from "$lib/server/cdn-cache";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, url, parent, locals, setHeaders }) => {
  setHeaders(CDN_CACHE_HEADER);
  const requestedCity = params.city;
  // URL slugs use hyphens for spaces: "wola-kopcowa" → "wola kopcowa"
  const requestedNorm = normalize(requestedCity.replace(/-/g, " "));

  const parentData = await parent();
  const lookups = parentData.lookups;

  // Prefer canonical slug lookup first (handles Łódź and synonyms correctly)
  const canonicalSlug = lookups.cityMap.get(requestedNorm);

  // Resolve city name first (cached, near-instant after first call)
  const allCities = await getUniqueCities();
  const exactCityName =
    (canonicalSlug ? lookups.cityGeo?.get(canonicalSlug)?.name : null) ??
    allCities.find((c) => c.toLowerCase() === requestedCity.toLowerCase()) ??
    allCities.find((c) => normalize(c) === requestedNorm);

  if (!exactCityName) {
    if (canonicalSlug && canonicalSlug !== requestedCity.toLowerCase()) {
      throw redirect(301, localizeHref(`/${canonicalSlug}`, locals.locale, i18nRouting));
    }

    throw error(404, "Nie znaleziono takiego miasta w naszej bazie.");
  }

  const resolvedCitySlug =
    canonicalSlug ??
    lookups.cityMap.get(normalize(exactCityName)) ??
    requestedCity.toLowerCase();

  if (resolvedCitySlug !== requestedCity) {
    throw redirect(301, localizeHref(`/${resolvedCitySlug}${url.search}`, locals.locale, i18nRouting));
  }

  const [cityListing, cityIntro] = await Promise.all([
    getListingsByCity(exactCityName),
    getCityIntro(resolvedCitySlug, locals.locale),
  ]);
  const pageParam = url.searchParams.get("page");
  const page = pageParam && /^[1-9]\d*$/.test(pageParam) ? Number(pageParam) : 1;
  const totalPages = Math.max(1, Math.ceil(cityListing.length / SEO_PAGE_SIZE));

  if ((pageParam && !/^[1-9]\d*$/.test(pageParam)) || page > totalPages) {
    throw error(404, "Nie znaleziono takiej strony wyników.");
  }

  if (pageParam && page === 1) {
    const searchParams = new URLSearchParams(url.searchParams);
    searchParams.delete("page");
    const search = searchParams.toString();
    throw redirect(
      301,
      localizeHref(`/${resolvedCitySlug}${search ? `?${search}` : ""}`, locals.locale, i18nRouting),
    );
  }

  const lat = parseFloat(url.searchParams.get("lat") ?? "");
  const lng = parseFloat(url.searchParams.get("lng") ?? "");
  const location =
    !isNaN(lat) && !isNaN(lng) ? { latitude: lat, longitude: lng } : null;

  return {
    city: exactCityName,
    citySlug: resolvedCitySlug,
    schools: cityListing,
    page,
    cityIntro,
    location,
    lookups,
  };
};
