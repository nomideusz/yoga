import type { Client } from '@libsql/client';

export interface SearchEventInput {
  query: string;
  queryNormalized?: string;
  page: string;
  cityContext?: string;
  action: string;
  layer?: string;
  resultCount?: number;
  clickedType?: string;
  clickedId?: string;
  sessionId?: string;
}

// Analytics never look back more than 90 days (see /api/search-health), so
// older events are dead weight every unbounded scan still pays for. Prune at
// most once a day per process, piggybacked on the write path.
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
let lastPruneAt = 0;

export async function logSearchEvent(db: Client, event: SearchEventInput): Promise<void> {
  if (Date.now() - lastPruneAt > PRUNE_INTERVAL_MS) {
    lastPruneAt = Date.now();
    db.execute("DELETE FROM search_events WHERE created_at < datetime('now', '-90 days')")
      .catch((err) => console.error('search_events prune failed:', err));
  }

  await db.execute({
    sql: `INSERT INTO search_events (query, query_normalized, page, city_context, action, layer, result_count, clicked_type, clicked_id, session_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      event.query,
      event.queryNormalized ?? null,
      event.page,
      event.cityContext ?? null,
      event.action,
      event.layer ?? null,
      event.resultCount ?? null,
      event.clickedType ?? null,
      event.clickedId ?? null,
      event.sessionId ?? null,
    ],
  });
}
