import { getAutocompleteIndex } from '$lib/server/db/queries/index';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const autocomplete = await getAutocompleteIndex();
  return { autocomplete };
};
