// @nomideusz/svelte-search — Public API
// ============================================================
// Geo utilities
export { haversineKm, walkingMinutes, boundingBox, formatDistance, formatWalkingTime, walkingRoute, } from './core/geo.js';
// Normalization & similarity
export { normalize, stripDiacriticsGeneric, trigrams, trigramSimilarity, levenshtein, levenshteinSimilarity, isPostcode, hasGeoIntent, stripGeoIntent, stripStopWords, MIN_SEARCH_TOKEN_LENGTH, } from './core/normalize.js';
// Search engine
export { createSearchEngine } from './core/engine.js';
// Indexer
export { createIndexer, createLookupsLoader } from './core/indexer.js';
// Resolver
export { parseQuery, findMatchingArea, findNearestLocationWithEntities } from './core/resolver.js';
// Tracker
export { createTracker } from './core/track.js';
