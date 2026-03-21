import type { DatabaseClient, SchemaAdapter, SearchResult, SearchLocale, ResolverLookups } from './types.js';
export interface IndexerConfig<TResult extends SearchResult = SearchResult> {
    db: DatabaseClient;
    adapter: SchemaAdapter<TResult>;
    locale?: SearchLocale;
}
export declare function createIndexer<TResult extends SearchResult = SearchResult>(config: IndexerConfig<TResult>): {
    indexTrigrams: (entityId: string | number, entity: Record<string, unknown>) => Promise<void>;
    reindexAllTrigrams: () => Promise<number>;
    rebuildFts: () => Promise<void>;
    checkFtsSync: () => Promise<{
        inEntities: number;
        inFts: number;
        missingFromFts: number;
        orphanedInFts: number;
    }>;
    renormalizeAll: (updateRow: (db: DatabaseClient, row: Record<string, unknown>) => Promise<void>) => Promise<number>;
};
export interface LoadLookupsConfig {
    db: DatabaseClient;
    locale?: SearchLocale;
    /** SQL + column mapping for locations (cities/destinations) */
    locations: {
        sql: string;
        slugCol: string;
        nameNormalizedCol: string;
        countCol?: string;
        latCol?: string;
        lngCol?: string;
        nameCol?: string;
    };
    /** SQL + column mapping for categories (styles/types) */
    categories: {
        sql: string;
        slugCol: string;
        nameNormalizedCol: string;
        aliasesNormalizedCol?: string;
    };
    /** SQL + column mapping for areas/districts */
    areas?: {
        sql: string;
        locationSlugCol: string;
        areasJsonCol: string;
    };
    /** SQL for synonym aliases to add to location/category maps */
    synonymsSql?: string;
    /** Cache TTL in ms (default: 5 minutes) */
    cacheTtlMs?: number;
}
export declare function createLookupsLoader(config: LoadLookupsConfig): {
    load: () => Promise<ResolverLookups>;
    invalidate: () => void;
};
