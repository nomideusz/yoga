import { getUniqueCities, getUniqueStyles, getCityCoords, getCityTranslations } from '$lib/server/db/queries/index';
import { loadResolverLookups } from '$lib/search';
import { client } from '$lib/server/db/index';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export async function load() {
  const [cities, styles, cityCoords, lookups, cityTransEn, cityTransUk] = await Promise.all([
    getUniqueCities(),
    getUniqueStyles(),
    getCityCoords(),
    loadResolverLookups(client),
    getCityTranslations('en'),
    getCityTranslations('uk'),
  ]);

  // Build serializable city translation maps: Polish name → translated name/locative
  // We need slug→Polish name mapping from the cities table (via lookups.cityGeo)
  const cityTranslations: Record<string, Record<string, { name: string; nameLoc: string | null }>> = { en: {}, uk: {} };
  
  // cityGeo is Map<slug, {lat, lng, name}> where name is the Polish name
  const geo = lookups.cityGeo;
  if (geo) {
    for (const [slug, info] of geo) {
      const enTrans = cityTransEn.get(slug);
      if (enTrans) {
        cityTranslations.en[info.name] = { name: enTrans.name, nameLoc: enTrans.nameLoc };
      }
      const ukTrans = cityTransUk.get(slug);
      if (ukTrans) {
        cityTranslations.uk[info.name] = { name: ukTrans.name, nameLoc: ukTrans.nameLoc };
      }
    }
  }

  return { cities, styles, cityCoords, lookups, cityTranslations, googleMapsApiKey: publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY ?? '' };
}
