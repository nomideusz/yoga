import { error, redirect } from "@sveltejs/kit";
import {
  getListingsByCity,
  getUniqueCities,
} from "$lib/server/db/queries/index";
import { normalize } from "$lib/search";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, url, parent }) => {
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
      throw redirect(301, `/${canonicalSlug}`);
    }

    throw error(404, "Nie znaleziono takiego miasta w naszej bazie.");
  }

  const resolvedCitySlug =
    canonicalSlug ??
    lookups.cityMap.get(normalize(exactCityName)) ??
    requestedCity.toLowerCase();

  if (resolvedCitySlug !== requestedCity.toLowerCase()) {
    throw redirect(301, `/${resolvedCitySlug}${url.search}`);
  }

  const cityListing = await getListingsByCity(exactCityName);

  const lat = parseFloat(url.searchParams.get("lat") ?? "");
  const lng = parseFloat(url.searchParams.get("lng") ?? "");
  const location =
    !isNaN(lat) && !isNaN(lng) ? { latitude: lat, longitude: lng } : null;

  return {
    city: exactCityName,
    citySlug: resolvedCitySlug,
    schools: cityListing,
    location,
    lookups,
  };
};
