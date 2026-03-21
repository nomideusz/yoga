const BASE_URL = "https://szkolyjogi.pl";

function slugifySegment(value: string): string {
  // Polish-specific diacritics must be replaced BEFORE NFD + strip,
  // because ł/Ł do not decompose in NFD and would be stripped as non-ASCII.
  const pl: Record<string, string> = {
    'ą': 'a', 'Ą': 'A', 'ć': 'c', 'Ć': 'C', 'ę': 'e', 'Ę': 'E',
    'ł': 'l', 'Ł': 'L', 'ń': 'n', 'Ń': 'N', 'ó': 'o', 'Ó': 'O',
    'ś': 's', 'Ś': 'S', 'ź': 'z', 'Ź': 'Z', 'ż': 'z', 'Ż': 'Z',
  };
  let r = '';
  for (const c of value) r += pl[c] ?? c;
  return r
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ListingPathInput = {
  id: string;
  city: string;
  citySlug?: string | null;
  slug?: string | null;
};

export function getCitySlug(city: string): string {
  return slugifySegment(city);
}

export function getCityPath(city: string, citySlug?: string | null): string {
  return `/${citySlug || getCitySlug(city)}`;
}

export function getStyleSlug(style: string): string {
  return slugifySegment(style);
}

export function getStylePath(style: string): string {
  return `/category/${encodeURIComponent(getStyleSlug(style))}`;
}

export function getCityStylePath(
  city: string,
  style: string,
  citySlug?: string | null,
): string {
  return `${getCityPath(city, citySlug)}?style=${encodeURIComponent(style)}`;
}

export function getListingPath(listing: ListingPathInput): string {
  return `${getCityPath(listing.city, listing.citySlug)}/${listing.slug || listing.id}`;
}

export function getListingAbsoluteUrl(listing: ListingPathInput): string {
  return `${BASE_URL}${getListingPath(listing)}`;
}

export function getListingClaimPath(listing: ListingPathInput): string {
  return `${getListingPath(listing)}/claim`;
}

export function getListingClaimAbsoluteUrl(listing: ListingPathInput): string {
  return `${BASE_URL}${getListingClaimPath(listing)}`;
}
