// Self-hosted magic-link auth. The DB is the source of truth for identity:
// users / login_tokens / sessions tables (see db/schema.ts). Login links are
// emailed via Stalwart SMTP ($lib/server/email). Only SHA-256 hashes of
// secrets are stored, so a DB leak exposes no usable tokens.
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { eq, lt } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, loginTokens, sessions } from '$lib/server/db/schema';
import { sendLoginLink } from '$lib/server/email';

// httpOnly cookie holding the session secret (same name as the old Appwrite
// cookie, so stale cookies simply fail resolution and get cleared).
export const SESSION_COOKIE = 'yoga_session';
export const SESSION_TTL_S = 60 * 60 * 24 * 365; // 1 year, matches old behaviour
const TOKEN_TTL_S = 15 * 60;

export type SessionUser = { id: string; email: string };

const hash = (secret: string) => createHash('sha256').update(secret).digest('hex');
const now = () => Math.floor(Date.now() / 1000);

// Best-effort in-memory rate limit: max 3 links per address per 15 minutes.
// Protects Stalwart from being used as a spam cannon via the login form.
const recentSends = new Map<string, number[]>();
function allowSend(email: string): boolean {
  const cutoff = Date.now() - TOKEN_TTL_S * 1000;
  const times = (recentSends.get(email) ?? []).filter((t) => t > cutoff);
  if (times.length >= 3) return false;
  times.push(Date.now());
  recentSends.set(email, times);
  return true;
}

/**
 * Email a magic link that returns the owner to `nextPath` (a same-origin path)
 * signed in. Clicking it proves control of the address. Existing users are
 * matched by email, so a returning owner lands back on their same account.
 * Throws on failure — callers surface a friendly message.
 */
export async function sendMagicLink(origin: string, email: string, nextPath: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!allowSend(normalized)) throw new Error(`rate limited: ${normalized}`);

  let user = (await db.select().from(users).where(eq(users.email, normalized)).limit(1))[0];
  if (!user) {
    user = { id: randomUUID(), email: normalized, createdAt: null };
    await db.insert(users).values({ id: user.id, email: normalized });
  }

  // Opportunistic cleanup keeps the token table from growing unbounded.
  await db.delete(loginTokens).where(lt(loginTokens.expiresAt, now()));

  const secret = randomBytes(32).toString('base64url');
  await db.insert(loginTokens).values({
    tokenHash: hash(secret),
    userId: user.id,
    expiresAt: now() + TOKEN_TTL_S,
  });

  const url = `${origin}/auth/verify?token=${secret}&next=${encodeURIComponent(nextPath)}`;
  await sendLoginLink(normalized, url);
}

/**
 * Exchange a single-use magic-link token for a durable session secret.
 * Returns the raw session secret (for the cookie), or null if the token is
 * invalid, expired, or already consumed (e.g. by an email-client prefetch).
 */
export async function exchangeTokenForSession(secret: string): Promise<string | null> {
  const tokenHash = hash(secret);
  const token = (await db.select().from(loginTokens).where(eq(loginTokens.tokenHash, tokenHash)).limit(1))[0];
  if (!token) return null;

  await db.delete(loginTokens).where(eq(loginTokens.tokenHash, tokenHash)); // single-use
  if (token.expiresAt < now()) return null;

  const sessionSecret = randomBytes(32).toString('base64url');
  await db.insert(sessions).values({
    tokenHash: hash(sessionSecret),
    userId: token.userId,
    expiresAt: now() + SESSION_TTL_S,
  });
  return sessionSecret;
}

/** Resolve a session cookie value into { id, email }, or null. */
export async function getSessionUser(secret: string): Promise<SessionUser | null> {
  const row = (
    await db
      .select({ id: users.id, email: users.email, expiresAt: sessions.expiresAt })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.tokenHash, hash(secret)))
      .limit(1)
  )[0];
  if (!row) return null;
  if (row.expiresAt < now()) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hash(secret)));
    return null;
  }
  return { id: row.id, email: row.email };
}

/** Delete the session server-side (logout). */
export async function deleteSession(secret: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hash(secret)));
}
