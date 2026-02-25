import { getAllListings, getUniqueCities, getUniqueStyles } from '$lib/server/db/queries';

export async function load() {
  const [listings, cities, styles] = await Promise.all([
    getAllListings(),
    getUniqueCities(),
    getUniqueStyles(),
  ]);

  return { listings, cities, styles };
}
