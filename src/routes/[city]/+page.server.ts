import { error } from '@sveltejs/kit';
import { getListingsByCity, getUniqueCities } from '$lib/server/db/queries/index';
import { normalize } from '$lib/search';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, parent }) => {
  const requestedCity = params.city;

  // Get lookups + cities in parallel (lookups cached, cities from layout)
  const [parentData, allCities] = await Promise.all([
    parent(),
    getUniqueCities(),
  ]);
  const lookups = parentData.lookups;

  // Match by exact name (e.g., /kraków) or normalized slug (e.g., /krakow)
  const exactCityName = allCities.find(c => c.toLowerCase() === requestedCity.toLowerCase())
    ?? allCities.find(c => normalize(c) === normalize(requestedCity));

  if (!exactCityName) {
    throw error(404, 'Nie znaleziono takiego miasta w naszej bazie.');
  }

  const cityListing = await getListingsByCity(exactCityName);

  // Find city slug from lookups
  const citySlug = lookups.cityMap.get(exactCityName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l')) ?? requestedCity.toLowerCase();

  // Read location from URL params (set by homepage search)
  const lat = parseFloat(url.searchParams.get('lat') ?? '');
  const lng = parseFloat(url.searchParams.get('lng') ?? '');
  const location = (!isNaN(lat) && !isNaN(lng))
    ? { latitude: lat, longitude: lng }
    : null;

  return {
    city: exactCityName,
    citySlug,
    schools: cityListing,
    location,
    lookups,
  };
};
