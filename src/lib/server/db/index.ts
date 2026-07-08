import { drizzle } from 'drizzle-orm/libsql/web';
import { createClient } from '@libsql/client/web';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

// Remote Turso over the web client (pure HTTP/WS, no native libsql binding) so it runs on any
// runtime incl. Alpine/musl. Runtime creds come from the environment (no secret baked into the
// build); during build/analyse the DB is never queried, so a placeholder URL is fine — the web
// client can't take :memory:.
const client = createClient(
  building
    ? { url: 'http://localhost' }
    : { url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN }
);

export { client };
export const db = drizzle(client, { schema });
