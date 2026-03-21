import type { SearchLocale } from './types.js';
/** Strip diacritics using Unicode NFD decomposition (generic, all languages). */
export declare function stripDiacriticsGeneric(text: string): string;
/** Full normalization: lowercase + strip diacritics + collapse whitespace. */
export declare function normalize(text: string, locale?: SearchLocale): string;
/** Generate trigrams from text. "hatha" → ["hat","ath","tha"] */
export declare function trigrams(text: string, locale?: SearchLocale): string[];
/** Trigram similarity (Jaccard coefficient). 0..1, higher = more similar. */
export declare function trigramSimilarity(a: string, b: string, locale?: SearchLocale): number;
/** Levenshtein distance between two strings. */
export declare function levenshtein(a: string, b: string): number;
/** Normalized Levenshtein similarity. 0..1, higher = more similar. */
export declare function levenshteinSimilarity(a: string, b: string, locale?: SearchLocale): number;
/** Detect postcode format: XX-XXX or XXXXX (Polish default, override via locale). */
export declare function isPostcode(text: string): boolean;
/** Detect "near me" intent using locale geo patterns. */
export declare function hasGeoIntent(query: string, locale?: SearchLocale): boolean;
/** Remove geo-intent phrases from query. */
export declare function stripGeoIntent(query: string, locale?: SearchLocale): string;
/**
 * Strip stop words/phrases from a NORMALIZED string.
 * Strips geo intent phrases first, then multi-word stop phrases,
 * then single stop tokens.
 */
export declare function stripStopWords(normalized: string, locale?: SearchLocale): string;
/**
 * Minimum token length for substring/prefix matching.
 * Tokens shorter than this are too ambiguous for client-side matching.
 */
export declare const MIN_SEARCH_TOKEN_LENGTH = 3;
