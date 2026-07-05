import type { DatabaseClient, SchemaAdapter, SearchParams, SearchResult, SearchResponse, SearchLocale, SqlDialect } from './types.js';
export interface SearchEngineConfig<TResult extends SearchResult = SearchResult> {
    db: DatabaseClient;
    adapter: SchemaAdapter<TResult>;
    locale?: SearchLocale;
    /** SQL dialect: 'sqlite' (default) or 'postgres' */
    dialect?: SqlDialect;
    /** FTS query timeout in ms (default: 5000) */
    ftsTimeoutMs?: number;
    /** Fuzzy query timeout in ms (default: 3000) */
    fuzzyTimeoutMs?: number;
    /** Primary result radius in km (default: 15) */
    primaryRadiusKm?: number;
    /** Nearby result radius in km (default: 30) */
    nearbyRadiusKm?: number;
    /** Max nearby results in response (default: 5) */
    maxNearby?: number;
    /** Quality gate threshold for fuzzy-only results (default: 0.75) */
    qualityThreshold?: number;
    /** Max FTS terms per query (default: 6) */
    maxFtsTerms?: number;
    /**
     * Per-column bm25 weights for FTS ranking, in FTS table column order
     * (SQLite only). Without this, all columns weigh equally — a term repeated
     * in a long description outranks an exact name match. Weight name-like
     * columns high and description-like columns low.
     */
    ftsColumnWeights?: number[];
}
export declare function createSearchEngine<TResult extends SearchResult = SearchResult>(config: SearchEngineConfig<TResult>): {
    search: (params: SearchParams) => Promise<SearchResponse<TResult>>;
};
