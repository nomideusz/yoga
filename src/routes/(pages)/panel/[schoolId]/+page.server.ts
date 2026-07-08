// Owner-facing editor for a single studio. Authorisation is the whole point:
// you may edit a school ONLY if this signed-in account has an *approved* claim
// for it. Checked on both load and save — never trust that load already gated.
import { error, fail, redirect } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { claimRequests, schools } from '$lib/server/db/schema';
import { normalize, plLocale } from '$lib/search';
import { localizeHref } from '@nomideusz/svelte-i18n';
import { i18nRouting } from '$lib/i18n-routing';
import type { Actions, PageServerLoad } from './$types';

/** The school, but only if `userId` has an approved claim for it. */
async function getOwnedSchoolOr403(userId: string | undefined, schoolId: string) {
  if (!userId) throw redirect(302, '/panel'); // not signed in → login home
  const [owned] = await db
    .select({ id: claimRequests.id })
    .from(claimRequests)
    .where(
      and(
        eq(claimRequests.ownerUserId, userId),
        eq(claimRequests.schoolId, schoolId),
        eq(claimRequests.status, 'approved'),
      ),
    )
    .limit(1);
  if (!owned) throw error(403, 'Nie masz uprawnień do edycji tej szkoły.');

  const [school] = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
  if (!school) throw error(404, 'Nie znaleziono szkoły');
  return school;
}

const str = (v: FormDataEntryValue | null) => v?.toString().trim() ?? '';
const num = (v: FormDataEntryValue | null): number | null => {
  const s = v?.toString().trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export const load: PageServerLoad = async ({ params, locals }) => {
  const school = await getOwnedSchoolOr403(locals.user?.id, params.schoolId);
  return { school };
};

export const actions: Actions = {
  save: async ({ params, request, locals }) => {
    // Re-check ownership on write — the load-time gate is not a security boundary.
    await getOwnedSchoolOr403(locals.user?.id, params.schoolId);

    const fd = await request.formData();
    const description = str(fd.get('description'));

    await db
      .update(schools)
      .set({
        description,
        phone: str(fd.get('phone')) || null,
        email: str(fd.get('email')) || null,
        websiteUrl: str(fd.get('websiteUrl')),
        scheduleUrl: str(fd.get('scheduleUrl')),
        pricingUrl: str(fd.get('pricingUrl')),
        singleClassPrice: num(fd.get('singleClassPrice')),
        openPrice: num(fd.get('openPrice')),
        pricingNotes: str(fd.get('pricingNotes')) || null,
        lastUpdated: new Date().toISOString().slice(0, 10),
        descriptionN: normalize(description, plLocale),
      })
      .where(eq(schools.id, params.schoolId));

    return { saved: true };
  },
};
