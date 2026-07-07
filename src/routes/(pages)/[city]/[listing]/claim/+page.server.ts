import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { claimRequests } from '$lib/server/db/schema';
import { getListingByIdentifier } from '$lib/server/db/queries';
import { sendClaimNotification } from '$lib/server/email';
import { getListingAbsoluteUrl, getListingClaimPath, getListingPath } from '$lib/paths';
import { localizeHref } from '@nomideusz/svelte-i18n';
import { i18nRouting } from '$lib/i18n-routing';
import { sendMagicLink } from '$lib/server/appwrite';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const listing = await getListingByIdentifier(params.listing);

  if (!listing) {
    throw error(404, 'Nie znaleziono szkoły');
  }

  const canonicalPath = getListingClaimPath(listing, 'pl');
  const requestedPath = `/${params.city}/${params.listing}/claim`;

  if (requestedPath !== canonicalPath) {
    throw redirect(301, localizeHref(canonicalPath, locals.locale, i18nRouting));
  }

  if (listing.source === 'manual') {
    throw redirect(302, localizeHref(getListingPath(listing, 'pl'), locals.locale, i18nRouting));
  }

  // Only a verified { id, email } crosses into the page — never the Appwrite client.
  const user = locals.user ? { id: locals.user.$id, email: locals.user.email } : null;
  return { listing, user };
};

export const actions: Actions = {
  // Step 1 — owner enters their studio email; Appwrite emails a magic link back
  // to /auth/verify. Clicking it proves they control the address (the claim proof)
  // and logs them in. We create the user lazily with ID.unique().
  requestLink: async ({ request, url }) => {
    const data = await request.formData();
    const email = data.get('email')?.toString().trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(400, { linkError: 'Podaj poprawny adres e-mail.', email });
    }

    // Return the owner to this exact claim page after they click the link.
    try {
      await sendMagicLink(url.origin, email, url.pathname);
    } catch (e) {
      console.error('[claim] magic-url token failed:', e);
      return fail(502, { linkError: 'Nie udało się wysłać linku. Spróbuj ponownie.', email });
    }

    return { linkSent: true, email };
  },

  // Step 2 — only reachable once signed in; the email is the verified account's.
  submit: async ({ request, params, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Zaloguj się, aby wysłać zgłoszenie.' });
    }
    const email = locals.user.email;

    const data = await request.formData();
    const name = data.get('name')?.toString().trim();
    const phone = data.get('phone')?.toString().trim() || null;
    const role = data.get('role')?.toString().trim();
    const message = data.get('message')?.toString().trim() || null;
    const consent = data.get('consent')?.toString().trim() === 'true';

    if (!name || !role) {
      return fail(400, {
        error: 'Wypełnij wymagane pola: imię i rola.',
        name, phone, role, message,
      });
    }

    if (!consent) {
      return fail(400, {
        error: 'Aby wysłać zgłoszenie, musisz wyrazić zgodę na przetwarzanie danych.',
        name, phone, role, message,
      });
    }

    const consentedAt = new Date().toISOString();

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
      appwriteUserId: locals.user.$id,
      consentedAt,
    });

    try {
      await sendClaimNotification({
        schoolName: listing.name,
        schoolId: listing.id,
        listingUrl: getListingAbsoluteUrl(listing, 'pl'),
        claimantName: name,
        claimantEmail: email,
        claimantPhone: phone,
        claimantRole: role,
        message,
        consentedAt,
      });
    } catch (e) {
      // Email failure should not block the claim submission — the claim is
      // already persisted above — but it must be visible in the deploy logs.
      console.error('[claim] notification email failed:', e);
    }

    return { success: true };
  },
};
