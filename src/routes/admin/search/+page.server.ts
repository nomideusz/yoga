import type { PageServerLoad } from './$types';
import { checkFtsSync } from '$lib/search/indexer';
import { client } from '$lib/server/db/index';

export const load: PageServerLoad = async ({ url }) => {
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') ?? '7', 10) || 7));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [fts, needsServer, needsGoogle, actions, volume, sessions, topClicked] = await Promise.all([
    checkFtsSync(client),
    client.execute({
      sql: `SELECT query_normalized, COUNT(*) as c FROM search_events
            WHERE action = 'needs_server' AND created_at >= ? GROUP BY query_normalized ORDER BY c DESC LIMIT 20`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT query_normalized, COUNT(*) as c FROM search_events
            WHERE layer = 'google' AND created_at >= ? GROUP BY query_normalized ORDER BY c DESC LIMIT 20`,
      args: [since],
    }),
    client.execute({
      sql: `SELECT action, COUNT(*) as c FROM search_events
            WHERE created_at >= ? GROUP BY action ORDER BY c DESC`,
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
  ]);

  const totalEvents = volume.rows.reduce((sum, r: any) => sum + Number(r.c), 0);

  return {
    days,
    fts: {
      inSchools: Number((fts as any).inSchools),
      inFts: Number((fts as any).inFts),
      missingFromFts: Number((fts as any).missingFromFts),
      orphanedInFts: Number((fts as any).orphanedInFts),
      synced: (fts as any).missingFromFts === 0 && (fts as any).orphanedInFts === 0,
    },
    totalEvents,
    uniqueSessions: Number((sessions.rows[0] as any)?.c ?? 0),
    needsServer: needsServer.rows.map((r: any) => ({ query: r.query_normalized, count: Number(r.c) })),
    needsGoogle: needsGoogle.rows.map((r: any) => ({ query: r.query_normalized, count: Number(r.c) })),
    actions: actions.rows.map((r: any) => ({ action: r.action, count: Number(r.c) })),
    dailyVolume: volume.rows.map((r: any) => ({ day: r.day, count: Number(r.c) })).reverse(),
    topClicked: topClicked.rows.map((r: any) => ({ type: r.clicked_type, count: Number(r.c) })),
  };
};
