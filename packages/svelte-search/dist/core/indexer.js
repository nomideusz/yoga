// ============================================================
// @nomideusz/svelte-search — Indexer
// ============================================================
// Generic trigram indexing and FTS maintenance, driven by SchemaAdapter.
import { normalize as normalizeText, trigrams } from './normalize.js';
// ── Create indexer ─────────────────────────────────────────
export function createIndexer(config) {
    const { db, adapter, locale } = config;
    const { tables, columns, trigramColumns } = adapter;
    /**
     * Index trigrams for a single entity.
     * Call after inserting/updating an entity.
     */
    async function indexTrigrams(entityId, entity) {
        await db.execute({
            sql: `DELETE FROM ${tables.trigrams} WHERE ${trigramColumns.entityId} = ?`,
            args: [entityId],
        });
        const entries = [];
        for (const { text, field } of adapter.trigramFields(entity)) {
            if (!text)
                continue;
            for (const t of trigrams(text, locale)) {
                entries.push({ trigram: t, field });
            }
        }
        const BATCH = 100;
        for (let i = 0; i < entries.length; i += BATCH) {
            const chunk = entries.slice(i, i + BATCH);
            const ph = chunk.map(() => '(?,?,?)').join(',');
            const args = chunk.flatMap(e => [e.trigram, entityId, e.field]);
            await db.execute({
                sql: `INSERT OR IGNORE INTO ${tables.trigrams} (${trigramColumns.trigram}, ${trigramColumns.entityId}, ${trigramColumns.field}) VALUES ${ph}`,
                args,
            });
        }
    }
    /** Rebuild all trigrams from scratch. */
    async function reindexAllTrigrams() {
        const result = await db.execute({ sql: `SELECT * FROM ${tables.entities}`, args: [] });
        let count = 0;
        for (const row of result.rows) {
            const id = row[columns.id];
            await indexTrigrams(id, row);
            count++;
        }
        return count;
    }
    /** Rebuild FTS5 index. */
    async function rebuildFts() {
        await db.execute({
            sql: `INSERT INTO ${tables.fts}(${tables.fts}) VALUES('rebuild')`,
            args: [],
        });
    }
    /** Check if FTS5 index is in sync with entities table. */
    async function checkFtsSync() {
        const [entityCount, ftsCount, missing, orphaned] = await Promise.all([
            db.execute({ sql: `SELECT COUNT(*) as c FROM ${tables.entities}`, args: [] }),
            db.execute({ sql: `SELECT COUNT(*) as c FROM ${tables.fts}`, args: [] }),
            db.execute({ sql: `SELECT COUNT(*) as c FROM ${tables.entities} s LEFT JOIN ${tables.fts} f ON s.rowid = f.rowid WHERE f.rowid IS NULL`, args: [] }),
            db.execute({ sql: `SELECT COUNT(*) as c FROM ${tables.fts} f LEFT JOIN ${tables.entities} s ON f.rowid = s.rowid WHERE s.rowid IS NULL`, args: [] }),
        ]);
        return {
            inEntities: Number(entityCount.rows[0].c),
            inFts: Number(ftsCount.rows[0].c),
            missingFromFts: Number(missing.rows[0].c),
            orphanedInFts: Number(orphaned.rows[0].c),
        };
    }
    /**
     * Re-derive all normalized columns from source data.
     * Call after changing the normalize() function or locale.
     * Requires a callback to update app-specific normalized columns.
     */
    async function renormalizeAll(updateRow) {
        const result = await db.execute({ sql: `SELECT * FROM ${tables.entities}`, args: [] });
        let count = 0;
        for (const row of result.rows) {
            await updateRow(db, row);
            const id = row[columns.id];
            await indexTrigrams(id, row);
            count++;
        }
        await rebuildFts();
        return count;
    }
    return {
        indexTrigrams,
        reindexAllTrigrams,
        rebuildFts,
        checkFtsSync,
        renormalizeAll,
    };
}
export function createLookupsLoader(config) {
    let _cached = null;
    let _cacheTime = 0;
    let _pending = null;
    const ttl = config.cacheTtlMs ?? 5 * 60 * 1000;
    async function load() {
        const now = Date.now();
        if (_cached && (now - _cacheTime) < ttl)
            return _cached;
        if (_pending)
            return _pending;
        _pending = reload();
        try {
            return await _pending;
        }
        finally {
            _pending = null;
        }
    }
    async function reload() {
        const { db, locale } = config;
        // Locations
        const locationMap = new Map();
        const locationEntityCount = new Map();
        const locationGeo = new Map();
        const locRows = await db.execute({ sql: config.locations.sql, args: [] });
        for (const row of locRows.rows) {
            locationMap.set(row[config.locations.nameNormalizedCol], row[config.locations.slugCol]);
            if (config.locations.countCol) {
                locationEntityCount.set(row[config.locations.slugCol], row[config.locations.countCol] ?? 0);
            }
            if (config.locations.latCol && config.locations.lngCol && config.locations.nameCol) {
                const lat = row[config.locations.latCol];
                const lng = row[config.locations.lngCol];
                if (lat != null && lng != null) {
                    locationGeo.set(row[config.locations.slugCol], {
                        lat, lng, name: row[config.locations.nameCol],
                    });
                }
            }
        }
        // Categories
        const categoryMap = new Map();
        const catRows = await db.execute({ sql: config.categories.sql, args: [] });
        for (const row of catRows.rows) {
            const nameN = row[config.categories.nameNormalizedCol];
            const slug = row[config.categories.slugCol];
            categoryMap.set(nameN, slug);
            // Index individual words (skip generic terms)
            for (const word of nameN.split(/\s+/)) {
                if (word && word.length > 2 && !categoryMap.has(word)) {
                    categoryMap.set(word, slug);
                }
            }
            // Index aliases
            if (config.categories.aliasesNormalizedCol) {
                const aliasesN = row[config.categories.aliasesNormalizedCol] || '';
                for (const alias of aliasesN.split(/\s+/)) {
                    if (alias)
                        categoryMap.set(alias, slug);
                }
            }
        }
        // Synonym expansion for location/category maps
        if (config.synonymsSql) {
            const synRows = await db.execute({ sql: config.synonymsSql, args: [] });
            for (const row of synRows.rows) {
                const alias = normalize(row.alias, locale);
                const canonical = normalize(row.canonical, locale);
                const category = row.category;
                if (category === 'city' || category === 'location') {
                    const slug = locationMap.get(canonical);
                    if (slug)
                        locationMap.set(alias, slug);
                }
                else if (category === 'style' || category === 'category') {
                    const slug = categoryMap.get(canonical);
                    if (slug)
                        categoryMap.set(alias, slug);
                }
            }
        }
        // Areas/districts
        const areaMap = new Map();
        if (config.areas) {
            const areaRows = await db.execute({ sql: config.areas.sql, args: [] });
            for (const row of areaRows.rows) {
                const locSlug = row[config.areas.locationSlugCol];
                const areasJson = row[config.areas.areasJsonCol] || '[]';
                const areas = JSON.parse(areasJson);
                areaMap.set(locSlug, areas.map(a => normalize(a, locale)));
            }
        }
        _cached = { locationMap, categoryMap, areaMap, locationEntityCount, locationGeo };
        _cacheTime = Date.now();
        return _cached;
    }
    /** Force cache invalidation. */
    function invalidate() {
        _cached = null;
        _cacheTime = 0;
    }
    return { load, invalidate };
}
// Re-alias for internal use
const normalize = normalizeText;
