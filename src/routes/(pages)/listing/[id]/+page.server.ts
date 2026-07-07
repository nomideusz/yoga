import { error, redirect } from "@sveltejs/kit";
import { getListingById } from "$lib/server/db/queries";
import { getListingPath } from "$lib/paths";
import { localizeHref } from "@nomideusz/svelte-i18n";
import { i18nRouting } from "$lib/i18n-routing";
import { CDN_CACHE_HEADER } from "$lib/server/cdn-cache";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
  setHeaders(CDN_CACHE_HEADER);
  const listing = await getListingById(params.id);

  if (!listing) {
    throw error(404, "Nie znaleziono szkoły");
  }

  throw redirect(301, localizeHref(getListingPath(listing, "pl"), locals.locale, i18nRouting));
};
