import { error, redirect } from "@sveltejs/kit";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "$lib/server/db";
import { claimRequests, schools, schoolStyles, styles } from "$lib/server/db/schema";
import { getListingByIdentifier, getReviewsBySchoolId, getSchoolTranslation, applyTranslation } from "$lib/server/db/queries";
import { getListingPath } from "$lib/paths";
import { localizeHref } from "@nomideusz/svelte-i18n";
import { i18nRouting } from "$lib/i18n-routing";
import { CDN_CACHE_HEADER } from "$lib/server/cdn-cache";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, request, url, locals, setHeaders }) => {
  setHeaders(CDN_CACHE_HEADER);
  const listing = await getListingByIdentifier(params.listing);

  if (!listing) {
    throw error(404, "Nie znaleziono szkoły");
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
  const [translationEn, translationUk, approvedClaim, styleCounts] = await Promise.all([
    getSchoolTranslation(listing.id, 'en'),
    getSchoolTranslation(listing.id, 'uk'),
    db
      .select({ id: claimRequests.id })
      .from(claimRequests)
      .where(and(eq(claimRequests.schoolId, listing.id), eq(claimRequests.status, 'approved')))
      .limit(1),
    // Per-style listed-school counts in this city, so style pills can link to
    // the style×city page only where it exists (≥ MIN_STYLE_CITY_LISTINGS).
    listing.styles.length > 0 && listing.citySlug
      ? db
          .select({ style: styles.name, n: count() })
          .from(schoolStyles)
          .innerJoin(styles, eq(schoolStyles.styleId, styles.id))
          .innerJoin(schools, eq(schoolStyles.schoolId, schools.id))
          .where(and(
            eq(schools.citySlug, listing.citySlug),
            eq(schools.isListed, true),
            inArray(styles.name, listing.styles),
          ))
          .groupBy(styles.name)
      : Promise.resolve([]),
  ]);

  return {
    listing,
    reviews,
    preferredLangs,
    verifiedOwner: approvedClaim.length > 0,
    styleCityCounts: Object.fromEntries(styleCounts.map((r) => [r.style, r.n])),
    translations: {
      en: translationEn,
      uk: translationUk,
    },
  };
};
