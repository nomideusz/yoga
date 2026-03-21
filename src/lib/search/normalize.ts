// src/lib/search/normalize.ts — Yoga normalize adapter
// Delegates to @nomideusz/svelte-search with Polish locale pre-applied.
// This file exists for backward compatibility — new code should import from
// @nomideusz/svelte-search directly.

import {
  normalize as _normalize,
  trigrams as _trigrams,
  trigramSimilarity as _trigramSimilarity,
  levenshteinSimilarity as _levenshteinSimilarity,
  hasGeoIntent as _hasGeoIntent,
  stripGeoIntent as _stripGeoIntent,
  stripStopWords as _stripStopWords,
  stripDiacriticsGeneric,
  levenshtein,
  isPostcode,
  MIN_SEARCH_TOKEN_LENGTH,
} from '@nomideusz/svelte-search';

import { plLocale, polishLocative, polishLocationStems as polishCityStems } from '@nomideusz/svelte-search/locales/pl';

// Pre-bind Polish locale so callers don't need to pass it
export function stripDiacritics(text: string): string {
  return plLocale.stripDiacritics(text);
}

export function normalize(text: string): string {
  return _normalize(text, plLocale);
}

export function trigrams(text: string): string[] {
  return _trigrams(text, plLocale);
}

export function trigramSimilarity(a: string, b: string): number {
  return _trigramSimilarity(a, b, plLocale);
}

export function levenshteinSimilarity(a: string, b: string): number {
  return _levenshteinSimilarity(a, b, plLocale);
}

export function hasGeoIntent(query: string): boolean {
  return _hasGeoIntent(query, plLocale);
}

export function stripGeoIntent(query: string): string {
  return _stripGeoIntent(query, plLocale);
}

export function stripStopWords(normalized: string): string {
  return _stripStopWords(normalized, plLocale);
}

export { levenshtein, isPostcode, MIN_SEARCH_TOKEN_LENGTH, stripDiacriticsGeneric, polishLocative, polishCityStems };
