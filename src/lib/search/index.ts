// src/lib/search/index.ts — re-export everything
export { normalize, stripDiacritics, trigrams, trigramSimilarity, isPostcode, hasGeoIntent, stripGeoIntent, stripStopWords, MIN_SEARCH_TOKEN_LENGTH, polishCityStems, polishLocative } from './normalize';
export { haversineKm, walkingMinutes, boundingBox, formatDistance, formatWalkingTime, walkingRoute } from './geo';
export { resolveSearch, findNearestCityWithSchools, type SearchContext, type SearchAction, type ResolverLookups } from './resolver';
export { search, autocomplete, type SearchParams, type SearchResult, type SearchResponse, type AutocompleteResult } from './engine';
export { insertSchool, loadResolverLookups, reindexAllTrigrams, rebuildFts, renormalizeAll, checkFtsSync, type SchoolInput } from './indexer';
export { trackSearch, type TrackSearchEvent } from './track';
