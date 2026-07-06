// Search canary — shared by /api/search-health and /admin/search.
// Samples listed schools and asserts each is findable through the real
// search path by its own full name. Catches the "school exists but search
// can't see it" class of bugs (empty _n columns, broken FTS sync, view
// drift) that row counts alone miss.
import type { Client } from '@libsql/client';
import { search } from '$lib/search/engine';

export interface CanaryResult {
  sampled: number;
  passed: number;
  failures: Array<{ id: string; name: string; query: string }>;
  unindexedListed: number;
}

export async function runCanary(client: Client, sampleSize = 5): Promise<CanaryResult> {
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
