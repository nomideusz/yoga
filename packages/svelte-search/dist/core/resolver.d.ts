import type { SearchLocale, ResolverLookups } from './types.js';
interface TokenMatch {
    matched: string;
    slug: string;
    original: string;
}
export interface ParsedQuery {
    /** Original normalized query */
    normalized: string;
    /** Query after stop word removal */
    working: string;
    /** Whether geo intent was detected */
    geoIntent: boolean;
    /** Extracted postal code, if any */
    postal: string | undefined;
    /** Matched location token */
    location: TokenMatch | null;
    /** Matched category token */
    category: TokenMatch | null;
    /** Remaining unclassified tokens */
    rest: string[];
}
/**
 * Parse and classify a raw search query.
 * Reusable by any app — the classification is the same,
 * only the dispatch logic differs.
 */
export declare function parseQuery(raw: string, lookups: ResolverLookups, locale?: SearchLocale): ParsedQuery;
/** Check if query matches an area/district in the given location. */
export declare function findMatchingArea(query: string, locationSlug: string, lookups: ResolverLookups, locale?: SearchLocale): string | null;
/**
 * Find the nearest location that has entities.
 * Useful for "no results" states.
 */
export declare function findNearestLocationWithEntities(lat: number, lng: number, lookups: ResolverLookups, excludeSlug?: string): {
    name: string;
    slug: string;
    distanceKm: number;
    count: number;
} | null;
export {};
