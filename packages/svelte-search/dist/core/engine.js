// ============================================================
// @nomideusz/svelte-search — Search engine
// ============================================================
// Generic search engine driven by a SchemaAdapter. Handles:
//   1. Synonym expansion
//   2. FTS5 full-text search
//   3. Trigram fuzzy fallback
//   4. Score blending (FTS rank + name similarity + field match + geo)
//   5. Quality gate (Levenshtein threshold for fuzzy-only results)
//   6. Relevance boundaries (distance-based result splitting)
import { normalize, trigrams, trigramSimilarity, levenshteinSimilarity, hasGeoIntent, stripGeoIntent } from './normalize.js';
import { haversineKm, walkingMinutes, boundingBox } from './geo.js';
// ── Query timeout helper ───────────────────────────────────
function withTimeout(promise, ms, fallback) {
    let timer;
    return Promise.race([
        promise,
        new Promise(resolve => { timer = setTimeout(() => resolve(fallback), ms); }),
    ]).finally(() => clearTimeout(timer));
}
// ── Create search engine ───────────────────────────────────
export function createSearchEngine(config) {
    const { db, adapter, locale, ftsTimeoutMs = 5000, fuzzyTimeoutMs = 3000, primaryRadiusKm = 15, nearbyRadiusKm = 30, maxNearby = 5, qualityThreshold = 0.75, maxFtsTerms = 6, } = config;
    const { tables, columns, trigramColumns } = adapter;
    // ── Main search ────────────────────────────────────────
    async function search(params) {
        const { query, locationSlug, categorySlug, lat, lng, limit = 20, offset = 0 } = params;
        if (!query?.trim()) {
            if (locationSlug)
                return searchAllInLocation(locationSlug, categorySlug, lat, lng, limit);
            if (lat != null && lng != null)
                return geoOnlySearch(lat, lng, limit);
            return empty();
        }
        // Normalize + strip geo intent
        const geoIntent = hasGeoIntent(query, locale);
        const cleanQuery = geoIntent ? stripGeoIntent(query, locale) : query;
        const normalized = normalize(cleanQuery, locale);
        if (geoIntent && !normalized) {
            if (locationSlug)
                return searchAllInLocation(locationSlug, categorySlug, lat, lng, limit);
            if (lat != null && lng != null)
                return geoOnlySearch(lat, lng, limit);
            return empty();
        }
        // Expand synonyms
        const expanded = await expandSynonyms(normalized);
        const ftsQuery = buildFtsQuery(expanded);
        // FTS5 search
        const ftsResults = await withTimeout(ftsSearch(ftsQuery, locationSlug, categorySlug, limit * 3), ftsTimeoutMs, []);
        // Trigram fallback if FTS returned few results
        let fuzzyResults = [];
        if (ftsResults.length < 5 && normalized.length >= 3) {
            fuzzyResults = await withTimeout(trigramFuzzySearch(normalized, locationSlug, limit * 2), fuzzyTimeoutMs, []);
        }
        // Merge, score, and rank
        const merged = deduplicateById([...ftsResults, ...fuzzyResults]);
        const scored = scoreResults(merged, normalized, lat, lng, geoIntent);
        // Quality gate — fuzzy-only results need high Levenshtein similarity
        const qualified = scored.filter(r => {
            if (r._hasFts)
                return true;
            const best = Math.max(levenshteinSimilarity(normalized, r._nameN || '', locale), levenshteinSimilarity(normalized, r._locationN || '', locale), levenshteinSimilarity(normalized, r._categoriesN || '', locale));
            return best >= qualityThreshold;
        });
        qualified.sort((a, b) => b.score - a.score);
        return applyRelevanceBoundaries(qualified, lat, lng, locationSlug, normalized, limit, offset);
    }
    // ── Location-scoped search ─────────────────────────────
    async function searchAllInLocation(locationSlug, categorySlug, lat, lng, limit) {
        let sql = `SELECT * FROM ${tables.entities} WHERE ${columns.locationSlug} = ?`;
        const args = [locationSlug];
        if (categorySlug && columns.categoriesNormalized) {
            const catName = normalize(categorySlug.replace(/-/g, ' '), locale);
            sql += ` AND ${columns.categoriesNormalized} LIKE ?`;
            args.push(`%${catName}%`);
        }
        sql += ' LIMIT ?';
        args.push(limit);
        const result = await db.execute({ sql, args });
        const rows = (result.rows).map(r => adapter.toResult(r, lat, lng));
        if (lat != null && lng != null) {
            rows.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
        }
        return { results: rows, nearby: [], noLocalResults: false, searchedPlace: null, nearestLocationWithEntities: null, totalFound: rows.length };
    }
    // ── Geo-only search ────────────────────────────────────
    async function geoOnlySearch(lat, lng, limit) {
        if (!columns.lat || !columns.lng)
            return empty();
        const bbox = boundingBox(lat, lng, primaryRadiusKm);
        const result = await db.execute({
            sql: `SELECT * FROM ${tables.entities} WHERE ${columns.lat} BETWEEN ? AND ? AND ${columns.lng} BETWEEN ? AND ? LIMIT ?`,
            args: [bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng, limit * 2],
        });
        const rows = (result.rows).map(r => adapter.toResult(r, lat, lng));
        rows.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
        const capped = rows.slice(0, limit);
        if (capped.length === 0) {
            return { results: [], nearby: [], noLocalResults: true, searchedPlace: null, nearestLocationWithEntities: null, totalFound: 0 };
        }
        return { results: capped, nearby: [], noLocalResults: false, searchedPlace: null, nearestLocationWithEntities: null, totalFound: capped.length };
    }
    // ── FTS5 search ────────────────────────────────────────
    async function ftsSearch(ftsQuery, locationSlug, categorySlug, limit) {
        if (!ftsQuery)
            return [];
        let sql = `
      SELECT s.*, fts.rank AS _ftsRank
      FROM ${tables.fts} fts
      JOIN ${tables.entities} s ON s.rowid = fts.rowid
      WHERE ${tables.fts} MATCH ?
    `;
        const args = [ftsQuery];
        if (locationSlug && columns.locationSlug) {
            sql += ` AND s.${columns.locationSlug} = ?`;
            args.push(locationSlug);
        }
        if (categorySlug && columns.categoriesNormalized) {
            const catName = normalize(categorySlug.replace(/-/g, ' '), locale);
            sql += ` AND s.${columns.categoriesNormalized} LIKE ?`;
            args.push(`%${catName}%`);
        }
        sql += ' ORDER BY fts.rank LIMIT ?';
        args.push(limit);
        const result = await db.execute({ sql, args });
        return result.rows;
    }
    // ── Trigram fuzzy search ───────────────────────────────
    async function trigramFuzzySearch(normalized, locationSlug, limit) {
        const queryTrigrams = trigrams(normalized, locale);
        if (queryTrigrams.length === 0)
            return [];
        const placeholders = queryTrigrams.map(() => '?').join(',');
        let sql = `
      SELECT s.*, NULL AS _ftsRank,
             (COUNT(DISTINCT t.${trigramColumns.trigram}) * 1.0 / ?) AS _fuzzyScore
      FROM ${tables.trigrams} t
      JOIN ${tables.entities} s ON s.${columns.id} = t.${trigramColumns.entityId}
      WHERE t.${trigramColumns.trigram} IN (${placeholders})
    `;
        const args = [queryTrigrams.length, ...queryTrigrams];
        if (locationSlug && columns.locationSlug) {
            sql += ` AND s.${columns.locationSlug} = ?`;
            args.push(locationSlug);
        }
        const minOverlap = queryTrigrams.length <= 3
            ? Math.max(1, queryTrigrams.length - 1)
            : Math.max(2, Math.ceil(queryTrigrams.length * 0.45));
        sql += ` GROUP BY t.${trigramColumns.entityId} HAVING COUNT(DISTINCT t.${trigramColumns.trigram}) >= ? ORDER BY _fuzzyScore DESC LIMIT ?`;
        args.push(minOverlap, limit);
        const result = await db.execute({ sql, args });
        return result.rows;
    }
    // ── Synonym expansion ──────────────────────────────────
    async function expandSynonyms(normalized) {
        const tokens = normalized.split(/\s+/).filter(Boolean);
        const expanded = [...tokens];
        const aliases = [...tokens];
        for (let i = 0; i < tokens.length - 1; i++) {
            aliases.push(`${tokens[i]} ${tokens[i + 1]}`);
        }
        if (aliases.length > 0) {
            const placeholders = aliases.map(() => '?').join(',');
            const result = await db.execute({
                sql: `SELECT canonical FROM ${tables.synonyms} WHERE alias IN (${placeholders})`,
                args: aliases,
            });
            for (const row of result.rows) {
                const canonical = row.canonical;
                if (!expanded.includes(canonical))
                    expanded.push(canonical);
            }
        }
        return expanded;
    }
    // ── FTS query builder ──────────────────────────────────
    function buildFtsQuery(tokens) {
        const terms = tokens
            .map(t => t.replace(/['"(){}*:^~\-]/g, ''))
            .filter(Boolean)
            .slice(0, maxFtsTerms)
            .map(t => `"${t}"*`);
        if (terms.length === 0)
            return '';
        return terms.length === 1 ? terms[0] : terms.join(' OR ');
    }
    // ── Scoring ────────────────────────────────────────────
    function scoreResults(rows, normalized, lat, lng, geoBoost) {
        return rows.map(row => {
            const result = adapter.toResult(row, lat, lng);
            let score = 0;
            // FTS rank (negative, lower = better)
            const ftsRank = row._ftsRank;
            if (ftsRank != null) {
                score += Math.min(1, Math.max(0, -ftsRank / 20)) * 0.40;
            }
            // Name similarity
            score += Math.max(trigramSimilarity(normalized, result._nameN || '', locale), levenshteinSimilarity(normalized, result._nameN || '', locale)) * 0.25;
            // Field match (categories/location/area)
            score += Math.max(trigramSimilarity(normalized, result._categoriesN || '', locale), trigramSimilarity(normalized, result._locationN || '', locale)) * 0.15;
            // Fuzzy score from trigram search
            const fuzzyScore = row._fuzzyScore;
            if (fuzzyScore != null)
                score += fuzzyScore * 0.30;
            // Geo proximity
            if (lat != null && lng != null && result.lat != null && result.lng != null) {
                const distanceKm = haversineKm(lat, lng, result.lat, result.lng);
                result.distanceKm = distanceKm;
                result.walkingMin = walkingMinutes(distanceKm);
                const proxScore = Math.max(0, 1 - distanceKm / 30);
                score += proxScore * 0.15;
                if (geoBoost)
                    score += proxScore * 0.25;
            }
            result.score = score;
            result._hasFts = ftsRank != null;
            return result;
        });
    }
    // ── Relevance boundaries ───────────────────────────────
    async function applyRelevanceBoundaries(scored, lat, lng, locationSlug, searchedPlace, limit, offset) {
        if (locationSlug) {
            const capped = stripInternal(scored.slice(offset, offset + limit));
            return {
                results: capped, nearby: [], noLocalResults: capped.length === 0,
                searchedPlace, nearestLocationWithEntities: null,
                totalFound: scored.length,
            };
        }
        if (lat == null || lng == null) {
            const capped = stripInternal(scored.slice(offset, offset + limit));
            return {
                results: capped, nearby: [], noLocalResults: capped.length === 0,
                searchedPlace, nearestLocationWithEntities: null,
                totalFound: scored.length,
            };
        }
        const primary = [];
        const nearby = [];
        for (const r of scored) {
            if (r.distanceKm == null) {
                primary.push(r);
                continue;
            }
            if (r.distanceKm <= primaryRadiusKm)
                primary.push(r);
            else if (r.distanceKm <= nearbyRadiusKm)
                nearby.push(r);
        }
        if (primary.length === 0 && nearby.length === 0) {
            return {
                results: [], nearby: [], noLocalResults: true,
                searchedPlace, nearestLocationWithEntities: null,
                totalFound: 0,
            };
        }
        return {
            results: stripInternal(primary.slice(offset, offset + limit)),
            nearby: stripInternal(nearby.slice(0, maxNearby)),
            noLocalResults: false, searchedPlace,
            nearestLocationWithEntities: null,
            totalFound: primary.length + nearby.length,
        };
    }
    // ── Helpers ────────────────────────────────────────────
    function stripInternal(results) {
        return results.map(r => {
            const { _hasFts, _nameN, _locationN, _categoriesN, ...rest } = r;
            return rest;
        });
    }
    function deduplicateById(rows) {
        const seen = new Set();
        return rows.filter(r => {
            const id = r[columns.id];
            if (seen.has(id))
                return false;
            seen.add(id);
            return true;
        });
    }
    function empty() {
        return { results: [], nearby: [], noLocalResults: false, searchedPlace: null, nearestLocationWithEntities: null, totalFound: 0 };
    }
    return { search };
}
