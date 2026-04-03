import { getAllListings } from '$lib/server/db/queries/listing';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const listings = await getAllListings();
  return {
    listings: listings.map((l) => ({
      id: l.id,
      name: l.name,
      city: l.city,
      address: l.address,
      description: l.description || l.editorialSummary || l.descriptionRaw || '',
      styles: l.styles,
      rating: l.rating,
      reviews: l.reviews,
      price: l.price,
      singleClassPrice: l.singleClassPrice,
    })),
  };
};
