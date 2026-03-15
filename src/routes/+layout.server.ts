import { getAllListings, getUniqueCities, getUniqueStyles, getCityCoords } from '$lib/server/db/queries/index';
import { loadResolverLookups } from '$lib/search';
import { client } from '$lib/server/db/index';
import { env } from '$env/dynamic/private';

export async function load() {
  const [listings, cities, styles, cityCoords, lookups] = await Promise.all([
    getAllListings(),
    getUniqueCities(),
    getUniqueStyles(),
    getCityCoords(),
    loadResolverLookups(client),
  ]);

  return { listings, cities, styles, cityCoords, lookups, googleMapsApiKey: env.GOOGLE_MAPS_API_KEY ?? '' };
}
