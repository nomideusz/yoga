import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { claimRequests, schools } from '$lib/server/db/schema';

async function lockSchoolForClaim(claimId: number) {
  const [claim] = await db
    .select({ schoolId: claimRequests.schoolId })
    .from(claimRequests)
    .where(eq(claimRequests.id, claimId))
    .limit(1);
  if (claim) {
    await db.update(schools).set({ scrapeLocked: true }).where(eq(schools.id, claim.schoolId));
  }
}

const STATUSES = ['pending', 'approved', 'rejected'] as const;

export const load: PageServerLoad = async () => {
  const rows = await db
    .select({
      id: claimRequests.id,
      schoolId: claimRequests.schoolId,
      name: claimRequests.name,
      email: claimRequests.email,
      phone: claimRequests.phone,
      role: claimRequests.role,
      message: claimRequests.message,
      status: claimRequests.status,
      consentedAt: claimRequests.consentedAt,
      createdAt: claimRequests.createdAt,
      schoolName: schools.name,
      schoolCity: schools.city,
      schoolCitySlug: schools.citySlug,
      schoolSlug: schools.slug,
    })
    .from(claimRequests)
    .leftJoin(schools, eq(claimRequests.schoolId, schools.id))
    .orderBy(desc(claimRequests.createdAt));

  return { claims: rows };
};

export const actions: Actions = {
  setstatus: async ({ request }) => {
    const data = await request.formData();
    const id = Number(data.get('id'));
    const status = data.get('status')?.toString() as (typeof STATUSES)[number];

    if (!Number.isInteger(id) || !STATUSES.includes(status)) {
      return fail(400, { error: 'Nieprawidłowe dane.' });
    }

    await db.update(claimRequests).set({ status }).where(eq(claimRequests.id, id));
    // Approval is the promise that the owner's data won't be overwritten —
    // lock the school against the scraper in the same step.
    if (status === 'approved') await lockSchoolForClaim(id);
    return { success: true, id, status };
  },

  delete: async ({ request }) => {
    const data = await request.formData();
    const id = Number(data.get('id'));

    if (!Number.isInteger(id)) {
      return fail(400, { error: 'Nieprawidłowe dane.' });
    }

    await db.delete(claimRequests).where(eq(claimRequests.id, id));
    return { success: true, id };
  },
};
