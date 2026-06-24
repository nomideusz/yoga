import { error, redirect } from "@sveltejs/kit";
import { getListingByIdentifier, getReviewsBySchoolId, getSchoolTranslation, applyTranslation } from "$lib/server/db/queries";
import { getListingPath } from "$lib/paths";
import { localizeHref } from "@nomideusz/svelte-i18n";
import { i18nRouting } from "$lib/i18n-routing";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, request, url, locals }) => {
  const listing = await getListingByIdentifier(params.listing);

  if (!listing) {
    throw error(404, "Nie znaleziono szko\u0142y");
  }

  const reviews = await getReviewsBySchoolId(listing.id);

  // Compare bare-to-bare (params are locale-stripped by reroute); redirect to
  // the canonical slug while preserving the request locale prefix.
  const canonicalPath = getListingPath(listing, "pl");
  const requestedPath = `/${params.city}/${params.listing}`;

  if (requestedPath !== canonicalPath) {
    throw redirect(301, localizeHref(canonicalPath, locals.locale, i18nRouting));
  }

  const acceptLang = request.headers.get("accept-language") ?? "pl";
  const preferredLangs = acceptLang
    .split(",")
    .map((part) => part.split(";")[0].trim().split("-")[0].toLowerCase())
    .filter(Boolean);

  // Fetch translations for EN and UK (they'll be applied client-side based on locale)
  const [translationEn, translationUk] = await Promise.all([
    getSchoolTranslation(listing.id, 'en'),
    getSchoolTranslation(listing.id, 'uk'),
  ]);

  return {
    listing,
    reviews,
    preferredLangs,
    translations: {
      en: translationEn,
      uk: translationUk,
    },
  };
};
