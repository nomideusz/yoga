import { error, redirect } from '@sveltejs/kit';
import { getListingById } from '$lib/server/db/queries/index';
import { getListingClaimPath } from '$lib/paths';
import { localizeHref } from '@nomideusz/svelte-i18n';
import { i18nRouting } from '$lib/i18n-routing';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const listing = await getListingById(params.id);

  if (!listing) {
    throw error(404, 'Nie znaleziono szkoły');
  }

  throw redirect(301, localizeHref(getListingClaimPath(listing, 'pl'), locals.locale, i18nRouting));
};
