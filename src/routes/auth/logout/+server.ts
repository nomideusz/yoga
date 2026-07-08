import { redirect } from '@sveltejs/kit';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  const secret = cookies.get(SESSION_COOKIE);
  if (secret) {
    try {
      await deleteSession(secret);
    } catch {
      // session already gone server-side — clearing the cookie is enough
    }
    cookies.delete(SESSION_COOKIE, { path: '/' });
  }
  throw redirect(303, '/');
};
