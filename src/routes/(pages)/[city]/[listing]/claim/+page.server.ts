import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { claimRequests } from '$lib/server/db/schema';
import { getListingByIdentifier } from '$lib/server/db/queries';
import { sendClaimNotification } from '$lib/server/email';
import { getListingAbsoluteUrl, getListingClaimPath, getListingPath } from '$lib/paths';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const listing = await getListingByIdentifier(params.listing);

  if (!listing) {
    throw error(404, 'Nie znaleziono szkoły');
  }

  const canonicalPath = getListingClaimPath(listing);
  const requestedPath = `/${params.city}/${params.listing}/claim`;

  if (requestedPath !== canonicalPath) {
    throw redirect(301, canonicalPath);
  }

  if (listing.source === 'manual') {
    throw redirect(302, getListingPath(listing));
  }

  return { listing };
};

export const actions: Actions = {
  default: async ({ request, params }) => {
    const data = await request.formData();
    const name = data.get('name')?.toString().trim();
    const email = data.get('email')?.toString().trim();
    const phone = data.get('phone')?.toString().trim() || null;
    const role = data.get('role')?.toString().trim();
    const message = data.get('message')?.toString().trim() || null;

    if (!name || !email || !role) {
      return fail(400, {
        error: 'Wypełnij wymagane pola: imię, e-mail i rola.',
        name, email, phone, role, message,
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(400, {
        error: 'Podaj poprawny adres e-mail.',
        name, email, phone, role, message,
      });
    }

    const listing = await getListingByIdentifier(params.listing);

    if (!listing) {
      throw error(404, 'Nie znaleziono szkoły');
    }

    await db.insert(claimRequests).values({
      schoolId: listing.id,
      name,
      email,
      phone,
      role,
      message,
    });

    try {
      await sendClaimNotification({
        schoolName: listing.name,
        schoolId: listing.id,
        listingUrl: getListingAbsoluteUrl(listing),
        claimantName: name,
        claimantEmail: email,
        claimantPhone: phone,
        claimantRole: role,
        message,
      });
    } catch {
      // Email failure should not block the claim submission
    }

    return { success: true };
  },
};
