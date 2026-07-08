// Owner home. Logged out → a magic-link sign-in (same mechanism as claiming).
// Logged in → the studios this account has claimed, with status; approved ones
// link to the editor. The main DB is the source of truth for claims and identity.
import { fail } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { claimRequests, schools } from '$lib/server/db/schema';
import { sendMagicLink } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) return { needsAuth: true, claims: [] };

  const claims = await db
    .select({
      id: claimRequests.id,
      status: claimRequests.status,
      role: claimRequests.role,
      createdAt: claimRequests.createdAt,
      schoolId: claimRequests.schoolId,
      schoolName: schools.name,
      schoolCity: schools.city,
    })
    .from(claimRequests)
    .leftJoin(schools, eq(claimRequests.schoolId, schools.id))
    .where(eq(claimRequests.ownerUserId, locals.user.id))
    .orderBy(desc(claimRequests.createdAt));

  return { needsAuth: false, email: locals.user.email, claims };
};

export const actions: Actions = {
  requestLink: async ({ request, url }) => {
    const email = (await request.formData()).get('email')?.toString().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(400, { linkError: 'Podaj poprawny adres e-mail.', email });
    }
    try {
      await sendMagicLink(url.origin, email, url.pathname);
    } catch (e) {
      console.error('[panel] magic-url token failed:', e);
      return fail(502, { linkError: 'Nie udało się wysłać linku. Spróbuj ponownie.', email });
    }
    return { linkSent: true, email };
  },
};
