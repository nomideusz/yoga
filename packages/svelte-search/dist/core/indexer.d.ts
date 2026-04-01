import type { DatabaseClient, SchemaAdapter, SearchResult, SearchLocale, SqlDialect, ResolverLookups } from './types.js';
export interface IndexerConfig<TResult extends SearchResult = SearchResult> {
    db: DatabaseClient;
    adapter: SchemaAdapter<TResult>;
    locale?: SearchLocale;
    /** SQL dialect: 'sqlite' (default) or 'postgres' */
    dialect?: SqlDialect;
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
    updateSearchVector: (entityId: string | number, searchText: string, tsConfig?: string) => Promise<void>;
    rebuildAllSearchVectors: (tsConfig?: string) => Promise<number>;
    renormalizeAll: (updateRow: (db: DatabaseClient, row: Record<string, unknown>) => Promise<void>) => Promise<number>;
    setupPostgresExtensions: () => Promise<void>;
};
export interface LoadLookupsConfig {
    db: DatabaseClient;
    locale?: SearchLocale;
    /** SQL dialect: 'sqlite' (default) or 'postgres' */
    dialect?: SqlDialect;
    /** SQL + column mapping for locations */
    locations: {
        sql: string;
        slugCol: string;
        nameNormalizedCol: string;
        countCol?: string;
        latCol?: string;
        lngCol?: string;
        nameCol?: string;
    };
    /** SQL + column mapping for categories */
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
    /** SQL for synonym aliases */
    synonymsSql?: string;
    /** Cache TTL in ms (default: 5 minutes) */
    cacheTtlMs?: number;
}
export declare function createLookupsLoader(config: LoadLookupsConfig): {
    load: () => Promise<ResolverLookups>;
    invalidate: () => void;
};
