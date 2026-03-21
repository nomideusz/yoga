// src/lib/search/index.ts — Yoga search adapter
// Re-exports from @nomideusz/svelte-search with yoga-specific wiring.

// ── Re-exports from package (generic) ──────────────────────
export {
  normalize,
  stripStopWords,
  trigrams,
  trigramSimilarity,
  levenshteinSimilarity,
  isPostcode,
  hasGeoIntent,
  stripGeoIntent,
  MIN_SEARCH_TOKEN_LENGTH,
  haversineKm,
  walkingMinutes,
  boundingBox,
  formatDistance,
  formatWalkingTime,
  walkingRoute,
  parseQuery,
  findMatchingArea,
  findNearestLocationWithEntities,
  type SearchResult,
  type SearchResponse,
  type SearchParams,
  type AutocompleteResult,
  type ResolverAction,
  type ParsedQuery,
} from '@nomideusz/svelte-search';

export { plLocale, polishLocative, polishLocationStems as polishCityStems } from '@nomideusz/svelte-search/locales/pl';

// ── Yoga-specific exports ──────────────────────────────────
export { type YogaResolverLookups, type YogaResolverLookups as ResolverLookups } from './types';
export { resolveSearch, findNearestCityWithSchools, type SearchContext, type SearchAction } from './resolver';
export { search, autocomplete } from './engine';
export { insertSchool, loadResolverLookups, reindexAllTrigrams, rebuildFts, renormalizeAll, checkFtsSync, type SchoolInput } from './indexer';
export { trackSearch, type TrackSearchEvent } from './track';
