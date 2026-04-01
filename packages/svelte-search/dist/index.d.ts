export type { SqlDialect, DatabaseClient, SchemaAdapter, SearchParams, SearchResult, SearchResponse, AutocompleteResult, SearchLocale, ResolverContext, ResolverLookups, ResolverAction, TrackSearchEvent, } from './core/types.js';
export { haversineKm, walkingMinutes, boundingBox, formatDistance, formatWalkingTime, walkingRoute, } from './core/geo.js';
export { normalize, stripDiacriticsGeneric, trigrams, trigramSimilarity, levenshtein, levenshteinSimilarity, isPostcode, hasGeoIntent, stripGeoIntent, stripStopWords, MIN_SEARCH_TOKEN_LENGTH, } from './core/normalize.js';
export { createSearchEngine, type SearchEngineConfig } from './core/engine.js';
export { createIndexer, createLookupsLoader, type IndexerConfig, type LoadLookupsConfig } from './core/indexer.js';
export { parseQuery, findMatchingArea, findNearestLocationWithEntities, type ParsedQuery } from './core/resolver.js';
export { createTracker, type TrackerConfig } from './core/track.js';
