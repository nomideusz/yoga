import { getAutocompleteIndex } from '$lib/server/db/queries/index';
import type { AutocompleteEntry } from '$lib/server/db/queries/types';
import { normalizePolish } from '$lib/utils/street';
import type { PageServerLoad } from './$types';

const NON_YOGA_STYLES = new Set(['Stretching', 'Barre', 'Tai Chi']);

function buildHomepageSearchData(autocomplete: AutocompleteEntry[]) {
  const cityCounts: Record<string, number> = {};
  const styleCounts: Record<string, number> = {};
  const cityStyleCounts: Record<string, Record<string, number>> = {};

  for (const entry of autocomplete) {
    cityCounts[entry.city] = (cityCounts[entry.city] ?? 0) + 1;

    const countsForCity = cityStyleCounts[entry.city] ?? (cityStyleCounts[entry.city] = {});
    for (const style of entry.styles) {
      styleCounts[style] = (styleCounts[style] ?? 0) + 1;
      countsForCity[style] = (countsForCity[style] ?? 0) + 1;
    }
  }

  const allCities = Object.entries(cityCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([city]) => city);

  const allStyles = Object.keys(styleCounts).sort();

  return {
    cityCounts,
    allCities,
    styleCounts,
    allStyles,
    cityStyleCounts,
    citySearchIndex: allCities.map((city) => ({
      city,
      normalized: normalizePolish(city),
    })),
    styleSearchIndex: allStyles.map((style) => ({
      style,
      normalized: normalizePolish(style),
    })),
    topCities: allCities.slice(0, 8).map((city) => ({
      type: 'city' as const,
      city,
      count: cityCounts[city] ?? 0,
    })),
    topCityChips: allCities.slice(0, 16).map((city) => ({
      city,
      count: cityCounts[city] ?? 0,
    })),
    topStyles: allStyles
      .filter((style) => !NON_YOGA_STYLES.has(style))
      .map((style) => ({ style, count: styleCounts[style] ?? 0 }))
      .sort((a, b) => b.count - a.count),
  };
}

export const load: PageServerLoad = async () => {
  const autocomplete = await getAutocompleteIndex();
  return {
    ...buildHomepageSearchData(autocomplete),
  };
};
