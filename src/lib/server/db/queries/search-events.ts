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

export async function logSearchEvent(db: Client, event: SearchEventInput): Promise<void> {
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
