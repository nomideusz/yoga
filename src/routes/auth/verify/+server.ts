// Magic-link landing. The login email links here with ?token & ?next; we
// exchange the single-use token for a session, drop the secret in an httpOnly
// cookie, and bounce the owner back to wherever they started (?next).
import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { exchangeTokenForSession, SESSION_COOKIE, SESSION_TTL_S } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const token = url.searchParams.get('token');
  const next = url.searchParams.get('next') ?? '/';

  if (token) {
    const sessionSecret = await exchangeTokenForSession(token);
    if (!sessionSecret) {
      // token expired, invalid, or already consumed (e.g. a link prefetch)
      throw redirect(303, '/?auth=failed');
    }
    cookies.set(SESSION_COOKIE, sessionSecret, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax', // link is clicked from an email (cross-site nav)
      secure: !dev, // localhost is http in dev
      maxAge: SESSION_TTL_S,
    });
  }

  // next is a same-origin path we generated ourselves; guard against open redirect.
  throw redirect(303, next.startsWith('/') ? next : '/');
};
