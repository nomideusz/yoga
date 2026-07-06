import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { checkFtsSync } from '$lib/search/indexer';
import { runCanary } from '$lib/server/search-canary';
import { normalize } from '$lib/search';
import { client } from '$lib/server/db/index';

type Row = Record<string, unknown>;

function num(row: Row | undefined, key: string): number {
  return Number(row?.[key] ?? 0);
}

function mapCount(rows: Row[], labelKey: string): { label: string; count: number }[] {
  return rows.map((r) => ({ label: String(r[labelKey] ?? ''), count: num(r, 'c') }));
}

function mapQuery(rows: Row[]): { query: string; count: number }[] {
  return rows.map((r) => ({ query: String(r.query_normalized ?? ''), count: num(r, 'c') }));
}

export const load: PageServerLoad = async ({ url }) => {
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') ?? '7', 10) || 7));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [
    fts,
    canary,
    synonyms,
    needsServer,
    needsGoogle,
    actions,
    layers,
    pages,
    volume,
    sessions,
    topClicked,
    topQueries,
    zeroResults,
    redirects,
    topSchools,
    topCities,
    strugglingSessions,
    recentEvents,
    resultStats,
    clickCount,
  ] = await Promise.all([
    checkFtsSync(client),
    runCanary(client),
    client.execute({
      sql: `SELECT alias, canonical, category FROM search_synonyms ORDER BY category, alias`,
      args: [],
    }),
    client.execute({
      sql: `SELECT query_normalized, COUNT(*) as c FROM search_events
            WHERE action = 'needs_server' AND created_at >= ? GROUP BY query_normalized ORDER BY c DESC LIMIT 25`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT query_normalized, COUNT(*) as c FROM search_events
            WHERE layer = 'google' AND created_at >= ? GROUP BY query_normalized ORDER BY c DESC LIMIT 25`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT action, COUNT(*) as c FROM search_events
            WHERE created_at >= ? GROUP BY action ORDER BY c DESC`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT COALESCE(layer, 'unknown') as layer, COUNT(*) as c FROM search_events
            WHERE created_at >= ? GROUP BY layer ORDER BY c DESC`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT page, COUNT(*) as c FROM search_events
            WHERE created_at >= ? GROUP BY page ORDER BY c DESC`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT DATE(created_at) as day, COUNT(*) as c FROM search_events
            WHERE created_at >= ? GROUP BY day ORDER BY day DESC LIMIT ?`,
      args: [since, days],
    }),
    client.execute({
      sql: `SELECT COUNT(DISTINCT session_id) as c FROM search_events WHERE created_at >= ?`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT clicked_type, COUNT(*) as c FROM search_events
            WHERE clicked_type IS NOT NULL AND created_at >= ? GROUP BY clicked_type ORDER BY c DESC`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT query_normalized, COUNT(*) as c FROM search_events
            WHERE query_normalized IS NOT NULL AND query_normalized != '' AND created_at >= ?
            GROUP BY query_normalized ORDER BY c DESC LIMIT 30`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT query_normalized, COUNT(*) as c FROM search_events
            WHERE result_count = 0 AND created_at >= ?
            GROUP BY query_normalized ORDER BY c DESC LIMIT 25`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT clicked_id, COUNT(*) as c FROM search_events
            WHERE clicked_type = 'redirect' AND clicked_id IS NOT NULL AND created_at >= ?
            GROUP BY clicked_id ORDER BY c DESC LIMIT 20`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT se.clicked_id, s.name, s.city, s.slug, s.city_slug, COUNT(*) as c
            FROM search_events se
            LEFT JOIN schools s ON s.id = se.clicked_id
            WHERE se.clicked_type = 'school' AND se.clicked_id IS NOT NULL AND se.created_at >= ?
            GROUP BY se.clicked_id ORDER BY c DESC LIMIT 20`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT clicked_id, COUNT(*) as c FROM search_events
            WHERE clicked_type = 'city' AND clicked_id IS NOT NULL AND created_at >= ?
            GROUP BY clicked_id ORDER BY c DESC LIMIT 15`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT session_id, COUNT(*) as c,
                   GROUP_CONCAT(query_normalized, ' → ') as trail
            FROM search_events
            WHERE session_id IS NOT NULL AND created_at >= ?
            GROUP BY session_id HAVING c >= 3
            ORDER BY c DESC LIMIT 15`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT query, query_normalized, page, city_context, action, layer,
                   result_count, clicked_type, clicked_id, created_at
            FROM search_events WHERE created_at >= ?
            ORDER BY created_at DESC LIMIT 40`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT
              COUNT(*) as total_with_results,
              SUM(CASE WHEN result_count = 0 THEN 1 ELSE 0 END) as zero_count,
              AVG(result_count) as avg_results
            FROM search_events
            WHERE result_count IS NOT NULL AND created_at >= ?`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT COUNT(*) as c FROM search_events
            WHERE action = 'select_result' AND created_at >= ?`,
      args: [since],
    }),
  ]);

  const totalEvents = volume.rows.reduce((sum, r) => sum + num(r as Row, 'c'), 0);
  const uniqueSessions = num(sessions.rows[0] as Row, 'c');
  const clicks = num(clickCount.rows[0] as Row, 'c');
  const stats = resultStats.rows[0] as Row;
  const withResults = num(stats, 'total_with_results');
  const zeroCount = num(stats, 'zero_count');

  return {
    days,
    since,
    fts: {
      inSchools: Number((fts as Row).inSchools),
      inFts: Number((fts as Row).inFts),
      missingFromFts: Number((fts as Row).missingFromFts),
      orphanedInFts: Number((fts as Row).orphanedInFts),
      synced: (fts as Row).missingFromFts === 0 && (fts as Row).orphanedInFts === 0,
    },
    canary,
    synonyms: (synonyms.rows as Row[]).map((r) => ({
      alias: String(r.alias),
      canonical: String(r.canonical),
      category: String(r.category),
    })),
    totalEvents,
    uniqueSessions,
    clicks,
    clickThroughRate: totalEvents > 0 ? Math.round((clicks / totalEvents) * 1000) / 10 : 0,
    eventsPerSession: uniqueSessions > 0 ? Math.round((totalEvents / uniqueSessions) * 10) / 10 : 0,
    zeroResultRate: withResults > 0 ? Math.round((zeroCount / withResults) * 1000) / 10 : 0,
    avgResults: stats.avg_results != null ? Math.round(Number(stats.avg_results) * 10) / 10 : null,
    needsServer: mapQuery(needsServer.rows as Row[]),
    needsGoogle: mapQuery(needsGoogle.rows as Row[]),
    actions: mapCount(actions.rows as Row[], 'action'),
    layers: mapCount(layers.rows as Row[], 'layer'),
    pages: mapCount(pages.rows as Row[], 'page'),
    dailyVolume: (volume.rows as Row[]).map((r) => ({ day: String(r.day), count: num(r, 'c') })).reverse(),
    topClicked: mapCount(topClicked.rows as Row[], 'clicked_type'),
    topQueries: mapQuery(topQueries.rows as Row[]),
    zeroResults: mapQuery(zeroResults.rows as Row[]),
    redirects: (redirects.rows as Row[]).map((r) => ({ city: String(r.clicked_id), count: num(r, 'c') })),
    topSchools: (topSchools.rows as Row[]).map((r) => ({
      id: String(r.clicked_id),
      name: r.name ? String(r.name) : null,
      city: r.city ? String(r.city) : null,
      slug: r.slug ? String(r.slug) : null,
      citySlug: r.city_slug ? String(r.city_slug) : null,
      count: num(r, 'c'),
    })),
    topCities: (topCities.rows as Row[]).map((r) => ({ slug: String(r.clicked_id), count: num(r, 'c') })),
    strugglingSessions: (strugglingSessions.rows as Row[]).map((r) => ({
      sessionId: String(r.session_id).slice(0, 8),
      count: num(r, 'c'),
      trail: String(r.trail ?? ''),
    })),
    recentEvents: (recentEvents.rows as Row[]).map((r) => ({
      query: String(r.query),
      queryNormalized: r.query_normalized ? String(r.query_normalized) : null,
      page: String(r.page),
      cityContext: r.city_context ? String(r.city_context) : null,
      action: String(r.action),
      layer: r.layer ? String(r.layer) : null,
      resultCount: r.result_count != null ? Number(r.result_count) : null,
      clickedType: r.clicked_type ? String(r.clicked_type) : null,
      clickedId: r.clicked_id ? String(r.clicked_id) : null,
      createdAt: String(r.created_at),
    })),
  };
};

const SYNONYM_CATEGORIES = new Set(['style', 'city', 'general']);

export const actions: Actions = {
  addSynonym: async ({ request }) => {
    const fd = await request.formData();
    const alias = normalize(String(fd.get('alias') ?? ''));
    const canonical = normalize(String(fd.get('canonical') ?? ''));
    const category = String(fd.get('category') ?? 'general');

    if (!alias || !canonical) return fail(400, { error: 'Alias i forma kanoniczna są wymagane.' });
    if (alias === canonical) return fail(400, { error: 'Alias i forma kanoniczna są identyczne.' });
    if (!SYNONYM_CATEGORIES.has(category)) return fail(400, { error: 'Nieznana kategoria.' });

    await client.execute({
      sql: 'INSERT OR IGNORE INTO search_synonyms (alias, canonical, category) VALUES (?, ?, ?)',
      args: [alias, canonical, category],
    });
    return { added: `${alias} → ${canonical}` };
  },

  deleteSynonym: async ({ request }) => {
    const fd = await request.formData();
    const alias = String(fd.get('alias') ?? '');
    const canonical = String(fd.get('canonical') ?? '');
    if (!alias || !canonical) return fail(400, { error: 'Brak aliasu.' });
    await client.execute({
      sql: 'DELETE FROM search_synonyms WHERE alias = ? AND canonical = ?',
      args: [alias, canonical],
    });
    return { deleted: alias };
  },
};
