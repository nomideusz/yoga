/**
 * Backfill geometrized photo placeholders for school hero images.
 *
 * Fetches each school's photo through the live site's /api/photo proxy — that
 * endpoint already handles Places auth, self-heals expired photo references
 * (persisting fresh ones back to the DB), and warms the CDN cache. Raw DB
 * photo_reference values can be stale, so don't hit the Places media API
 * directly. Fits shapes with @nomideusz/svelte-geometrize and stores the
 * placeholder JSON in schools.photo_placeholder. Idempotent: only fills rows
 * where the column is still NULL, so re-running after new schools arrive is
 * cheap.
 *
 * Cold fetches are billed Places media calls (~$7/1000).
 *
 * Usage:
 *   pnpm db:photo-placeholders              # backfill all missing
 *   pnpm db:photo-placeholders --limit 5    # smoke test on a few first
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { generatePlaceholder } from '@nomideusz/svelte-geometrize/node';

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : Infinity;
const CONCURRENCY = 4;
const PHOTO_BASE = 'https://szkolyjogi.pl/api/photo';

const client = createClient({
	url: process.env.TURSO_DATABASE_URL!,
	authToken: process.env.TURSO_AUTH_TOKEN,
});

async function fetchPhotoBytes(row: { id: string; ref: string; img: string }): Promise<Buffer | null> {
	// same preference order as the hero: Places proxy first, scraped URL fallback
	const url = row.ref ? `${PHOTO_BASE}/${row.id}?v=2` : row.img;
	if (!url) return null;
	const res = await fetch(url, { redirect: 'follow' });
	if (!res.ok) return null;
	const contentType = res.headers.get('content-type') ?? '';
	if (!contentType.startsWith('image/')) return null;
	return Buffer.from(await res.arrayBuffer());
}

async function processSchool(row: { id: string; name: string; ref: string; img: string }) {
	const bytes = await fetchPhotoBytes(row);
	if (!bytes) return `skip (no image): ${row.name}`;
	const placeholder = await generatePlaceholder(bytes);
	await client.execute({
		sql: 'UPDATE schools SET photo_placeholder = ? WHERE id = ?',
		args: [JSON.stringify(placeholder), row.id],
	});
	return null;
}

const result = await client.execute(`
	SELECT id, name, photo_reference AS ref, image_url AS img
	FROM schools
	WHERE is_listed = 1
	  AND photo_placeholder IS NULL
	  AND (photo_reference != '' OR image_url != '')
`);
const rows = (result.rows as unknown as { id: string; name: string; ref: string; img: string }[]).slice(
	0,
	LIMIT === Infinity ? undefined : LIMIT,
);
console.log(`${result.rows.length} schools missing placeholders, processing ${rows.length}`);

let done = 0;
let failed = 0;
// ponytail: fixed-size worker pool, no queue lib
const queue = [...rows];
await Promise.all(
	Array.from({ length: CONCURRENCY }, async () => {
		for (let row = queue.shift(); row; row = queue.shift()) {
			try {
				const note = await processSchool(row);
				if (note) {
					failed++;
					console.warn(note);
				}
			} catch (err) {
				failed++;
				console.error(`error: ${row.name} —`, err instanceof Error ? err.message : err);
			}
			done++;
			if (done % 25 === 0 || done === rows.length) console.log(`${done}/${rows.length}`);
		}
	}),
);
console.log(`done: ${done - failed} placeholders written, ${failed} skipped/failed`);
