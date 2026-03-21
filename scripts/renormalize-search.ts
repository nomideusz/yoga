/**
 * Re-derive all normalized shadow columns, trigrams, and FTS5 index.
 * Run after changing normalize() logic in search/normalize.ts.
 *
 * Usage:
 *   npx tsx scripts/renormalize-search.ts
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { renormalizeAll } from '../src/lib/search/indexer';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  console.log('Re-normalizing all schools...');
  const count = await renormalizeAll(client);
  console.log(`Done. ${count} schools re-normalized (shadow columns + trigrams + FTS5).`);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
