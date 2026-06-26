import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

// Runtime env (not $env/static) so one build runs against any DB via injected vars — no secret baked
// into the image. During build/analyse no DB env exists, so use a throwaway in-memory client (never
// queried); at runtime the real Turso creds come from the environment (createClient throws if unset).
const client = createClient(
  building
    ? { url: ':memory:' }
    : { url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN }
);

export { client };
export const db = drizzle(client, { schema });
