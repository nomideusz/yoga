// src/lib/search/index.ts — re-export everything
export { normalize, stripDiacritics, trigrams, trigramSimilarity, isPostcode, hasGeoIntent } from './normalize';
export { haversineKm, walkingMinutes, boundingBox, formatDistance, formatWalkingTime, walkingRoute } from './geo';
export { resolveSearch, type SearchContext, type SearchAction, type ResolverLookups } from './resolver';
export { search, autocomplete, type SearchParams, type SearchResult, type SearchResponse, type AutocompleteResult } from './engine';
export { insertSchool, loadResolverLookups, reindexAllTrigrams, rebuildFts, type SchoolInput } from './indexer';
