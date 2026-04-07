import { getUniqueCities, getUniqueStyles, getCityCoords, getCityTranslations } from '$lib/server/db/queries/index';
import { loadResolverLookups } from '$lib/search';
import { client } from '$lib/server/db/index';
import { env as publicEnv } from '$env/dynamic/public';

const LAYOUT_DATA_TTL_MS = 5 * 60 * 1000;

type LayoutData = Awaited<ReturnType<typeof buildLayoutData>>;

let cachedLayoutData: { value: LayoutData; expiresAt: number } | null = null;
let inflightLayoutData: Promise<LayoutData> | null = null;

async function buildLayoutData() {
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

async function getCachedLayoutData(): Promise<LayoutData> {
  if (cachedLayoutData && cachedLayoutData.expiresAt > Date.now()) {
    return cachedLayoutData.value;
  }

  if (inflightLayoutData) return inflightLayoutData;

  inflightLayoutData = buildLayoutData().finally(() => {
    inflightLayoutData = null;
  });

  const value = await inflightLayoutData;
  cachedLayoutData = {
    value,
    expiresAt: Date.now() + LAYOUT_DATA_TTL_MS,
  };

  return value;
}

export async function load() {
  return getCachedLayoutData();
}
