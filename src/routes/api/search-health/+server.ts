import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkFtsSync } from '$lib/search/indexer';
import { search } from '$lib/search/engine';
import { client } from '$lib/server/db/index';

/**
 * Canary: sample listed schools and assert each is findable through the real
 * search path by its own most distinctive name token. Catches the "school
 * exists but search can't see it" class of bugs (empty _n columns, broken
 * FTS sync, view drift) that row counts alone miss.
 */
async function runCanary(sampleSize = 5) {
  // Direct check for the worst case: listed schools with no normalized name
  // are invisible to FTS/trigram search (and to the sample below)
  const unindexed = await client.execute(
    "SELECT COUNT(*) AS c FROM schools WHERE is_listed = 1 AND (name_n = '' OR name_n IS NULL)",
  );
  const unindexedCount = Number((unindexed.rows[0] as any).c);

  const all = await client.execute(
    "SELECT id, name, name_n FROM schools WHERE is_listed = 1 AND name_n != ''",
  );
  const rows = all.rows as any[];

  // Document frequency of name tokens across listed schools. Schools whose
  // every name token is common (e.g. "Studio Jogi Kraków") can't be uniquely
  // identified by a name search — those are skipped, not probed.
  const df = new Map<string, number>();
  for (const row of rows) {
    for (const t of new Set((row.name_n as string).split(/[\s-]+/))) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  const rarestDf = (nameN: string) =>
    Math.min(
      ...nameN.split(/[\s-]+/).filter((t) => t.length >= 4).map((t) => df.get(t) ?? Infinity),
    );

  const shuffled = [...rows].sort(() => Math.random() - 0.5);
  const failures: Array<{ id: string; name: string; query: string }> = [];
  let sampled = 0;
  for (const row of shuffled) {
    if (sampled >= sampleSize) break;
    if (rarestDf(row.name_n as string) > 5) continue; // not uniquely identifiable
    sampled++;
    // Probe with the school's full name — the realest user query there is
    const resp = await search(client, { query: row.name as string, limit: 30 });
    if (!resp.results.some((r) => r.id === row.id)) {
      failures.push({ id: row.id as string, name: row.name as string, query: row.name as string });
    }
  }
  return { sampled, passed: sampled - failures.length, failures, unindexedListed: unindexedCount };
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const include = url.searchParams.get('include') ?? '';
    const [fts, canary] = await Promise.all([checkFtsSync(client), runCanary()]);
    const ftsSynced = fts.missingFromFts === 0 && fts.orphanedInFts === 0;
    const healthy = ftsSynced && canary.failures.length === 0 && canary.unindexedListed === 0;

    const result: Record<string, unknown> = {
      status: healthy ? 'ok' : 'degraded',
      fts: { ...fts, synced: ftsSynced },
      canary,
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
