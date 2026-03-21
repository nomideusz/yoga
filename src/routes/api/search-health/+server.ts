import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkFtsSync } from '$lib/search/indexer';
import { client } from '$lib/server/db/index';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const include = url.searchParams.get('include') ?? '';
    const fts = await checkFtsSync(client);
    const healthy = fts.missingFromFts === 0 && fts.orphanedInFts === 0;

    const result: Record<string, unknown> = {
      status: healthy ? 'ok' : 'degraded',
      fts: { ...fts, synced: healthy },
    };

    if (include.includes('analytics')) {
      const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') ?? '7', 10) || 7));
      const since = new Date(Date.now() - days * 86_400_000).toISOString();

      const [topNeeds, topGoogle, topActions, volume] = await Promise.all([
        // Queries that fell through to server (candidates for client-side aliases)
        client.execute({
          sql: `SELECT query_normalized, COUNT(*) as c FROM search_events
                WHERE action = 'needs_server' AND created_at >= ? GROUP BY query_normalized ORDER BY c DESC LIMIT 20`,
          args: [since],
        }),
        // Queries that needed Google Places (missing from our DB)
        client.execute({
          sql: `SELECT query_normalized, COUNT(*) as c FROM search_events
                WHERE layer = 'google' AND created_at >= ? GROUP BY query_normalized ORDER BY c DESC LIMIT 20`,
          args: [since],
        }),
        // Action distribution
        client.execute({
          sql: `SELECT action, COUNT(*) as c FROM search_events
                WHERE created_at >= ? GROUP BY action ORDER BY c DESC`,
          args: [since],
        }),
        // Daily volume
        client.execute({
          sql: `SELECT DATE(created_at) as day, COUNT(*) as c FROM search_events
                WHERE created_at >= ? GROUP BY day ORDER BY day DESC LIMIT ?`,
          args: [since, days],
        }),
      ]);

      result.analytics = {
        period: `${days}d`,
        needsServer: topNeeds.rows.map((r: any) => ({ query: r.query_normalized, count: r.c })),
        needsGoogle: topGoogle.rows.map((r: any) => ({ query: r.query_normalized, count: r.c })),
        actions: Object.fromEntries(topActions.rows.map((r: any) => [r.action, Number(r.c)])),
        dailyVolume: topVolume(volume.rows),
      };
    }

    return json(result);
  } catch (err) {
    console.error('Search health check error:', err);
    return json({ status: 'error' }, { status: 500 });
  }
};

function topVolume(rows: any[]): Record<string, number> {
  return Object.fromEntries(rows.map((r: any) => [r.day, Number(r.c)]));
}
