// Magic-URL landing. Appwrite emails a link to this route with ?userId & ?secret
// appended; we exchange them for a session, drop the secret in an httpOnly
// cookie, and bounce the owner back to wherever they started (?next).
import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { guestAccount, SESSION_COOKIE } from '$lib/server/appwrite';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const userId = url.searchParams.get('userId');
  const secret = url.searchParams.get('secret');
  const next = url.searchParams.get('next') ?? '/';

  if (userId && secret) {
    try {
      const session = await guestAccount().createSession(userId, secret);
      cookies.set(SESSION_COOKIE, session.secret, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax', // link is clicked from an email (cross-site nav)
        secure: !dev, // localhost is http in dev
        expires: new Date(session.expire),
      });
    } catch (e) {
      console.error('[auth] magic-url session exchange failed:', e);
      throw redirect(303, '/?auth=failed');
    }
  }

  // next is a same-origin path we generated ourselves; guard against open redirect.
  throw redirect(303, next.startsWith('/') ? next : '/');
};
