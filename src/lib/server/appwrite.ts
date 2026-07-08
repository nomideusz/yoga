// Appwrite = identity only. Turso stays the source of truth; we only ever
// pull a verified { $id, email } out of Appwrite and store the id on our rows.
//
// All calls are server-side (SvelteKit form actions / loads), so endpoint +
// project id live in private env and no browser SDK is shipped. Magic-URL
// token + session creation are public (guest-scope) endpoints, so a
// project-only client with no API key is enough — the only privileged call we
// make is account.get(), which authorises with the user's own session secret.
import { Client, Account, ID } from 'node-appwrite';
import { env } from '$env/dynamic/private';

// Endpoint + project id are not secrets, so they carry public defaults — the app
// works in prod without any env wiring, and env still overrides for staging.
const ENDPOINT = env.APPWRITE_ENDPOINT ?? 'https://appwrite.zaur.app/v1';
const PROJECT = env.APPWRITE_PROJECT_ID ?? '6a4d83760038ed76b167';

// httpOnly cookie holding the Appwrite session secret. Namespaced so it can't
// collide with Appwrite's own a_session_* cookies if this app is ever same-site.
export const SESSION_COOKIE = 'yoga_session';

function base() {
  // pl → Appwrite renders the magic-link subject + body from its built-in Polish
  // translations (no custom template needed, which would otherwise blank the body).
  return new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setLocale('pl');
}

/** Guest client — for createMagicURLToken / createSession. */
export function guestAccount() {
  return new Account(base());
}

/** A client authorised as the user, for account.get() / deleteSession. */
export function sessionAccount(secret: string) {
  return new Account(base().setSession(secret));
}

/**
 * Exchange a magic-url token (userId + secret) for a durable session secret.
 * We hit the REST endpoint directly rather than the SDK because a keyless
 * (client-mode) createSession returns the secret ONLY in a Set-Cookie header
 * (`a_session_<project>`), never in the JSON body — the SDK's `session.secret`
 * comes back empty, so the naive approach silently sets an empty cookie.
 * Returns the raw session secret (usable with setSession), or null on failure.
 */
export async function exchangeTokenForSession(
  userId: string,
  secret: string,
): Promise<string | null> {
  const res = await fetch(`${ENDPOINT}/account/sessions/token`, {
    method: 'POST',
    headers: { 'X-Appwrite-Project': PROJECT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, secret }),
  });
  if (!res.ok) return null; // invalid/expired/consumed token

  const prefix = `a_session_${PROJECT}=`; // the non-legacy cookie holds the secret
  const cookies = res.headers.getSetCookie?.() ?? [];
  for (const c of cookies) {
    if (c.startsWith(prefix)) return decodeURIComponent(c.slice(prefix.length).split(';')[0]);
  }
  return null;
}

/**
 * Email a magic link that returns the owner to `nextPath` (a same-origin path)
 * signed in. Clicking it proves control of the address. Existing users are
 * matched by email, so a returning owner lands back on their same account.
 * Throws on failure — callers surface a friendly message.
 */
export async function sendMagicLink(origin: string, email: string, nextPath: string) {
  const url = `${origin}/auth/verify?next=${encodeURIComponent(nextPath)}`;
  await guestAccount().createMagicURLToken(ID.unique(), email, url);
}

export { ID };
