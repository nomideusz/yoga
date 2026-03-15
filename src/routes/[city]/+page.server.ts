import { error } from '@sveltejs/kit';
import { getListingsByCity, getUniqueCities } from '$lib/server/db/queries/index';
import { normalize } from '$lib/search';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, parent }) => {
  const requestedCity = params.city;

  // Resolve city name first (cached, near-instant after first call)
  const allCities = await getUniqueCities();
  const exactCityName = allCities.find(c => c.toLowerCase() === requestedCity.toLowerCase())
    ?? allCities.find(c => normalize(c) === normalize(requestedCity));

  if (!exactCityName) {
    throw error(404, 'Nie znaleziono takiego miasta w naszej bazie.');
  }

  // Now run parent() and city listings in parallel
  const [parentData, cityListing] = await Promise.all([
    parent(),
    getListingsByCity(exactCityName),
  ]);

  const lookups = parentData.lookups;
  const citySlug = lookups.cityMap.get(exactCityName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l')) ?? requestedCity.toLowerCase();

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
