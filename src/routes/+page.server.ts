import { loadResolverLookups } from '$lib/search';
import { client } from '$lib/server/db/index';
import { getAllListings, getUniqueCities, getUniqueStyles } from '$lib/server/db/queries/index';

export async function load() {
  const lookups = await loadResolverLookups(client);
  const listings = await getAllListings();
  const cities = await getUniqueCities();
  const styles = await getUniqueStyles();

  return { lookups, listings, cities, styles };
}
