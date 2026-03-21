import { error, redirect } from "@sveltejs/kit";
import { getListingById } from "$lib/server/db/queries";
import { getListingPath } from "$lib/paths";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const listing = await getListingById(params.id);

  if (!listing) {
    throw error(404, "Nie znaleziono szkoły");
  }

  throw redirect(301, getListingPath(listing));
};
