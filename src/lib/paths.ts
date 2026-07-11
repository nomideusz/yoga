import { localizeHref } from "@nomideusz/svelte-i18n";
import { i18n } from "./i18n";
import { i18nRouting } from "./i18n-routing";

export const BASE_URL = "https://szkolyjogi.pl";

/**
 * Prefix a canonical (default-locale) path with the active locale.
 * In component render `locale` defaults to the reactive current locale; in
 * server/load contexts (canonical, sitemap) pass the request locale explicitly.
 */
function loc(path: string, locale?: string): string {
  return localizeHref(path, locale ?? i18n.locale, i18nRouting);
}

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

export function getCityPath(city: string, citySlug?: string | null, locale?: string): string {
  return loc(`/${citySlug || getCitySlug(city)}`, locale);
}

/** Localized city path when the slug is already known (no city name needed). */
export function getCitySlugPath(citySlug: string, locale?: string): string {
  return loc(`/${citySlug}`, locale);
}

export function getStyleSlug(style: string): string {
  return slugifySegment(style);
}

export function getStylePath(style: string, locale?: string): string {
  return loc(`/category/${encodeURIComponent(getStyleSlug(style))}`, locale);
}

export function getStyleCityPath(
  style: string,
  city: string,
  citySlug?: string | null,
  locale?: string,
): string {
  return loc(
    `/category/${encodeURIComponent(getStyleSlug(style))}/${citySlug || getCitySlug(city)}`,
    locale,
  );
}

export function getCityStylePath(
  city: string,
  style: string,
  citySlug?: string | null,
  locale?: string,
): string {
  return `${getCityPath(city, citySlug, locale)}?style=${encodeURIComponent(style)}`;
}

export function getListingPath(listing: ListingPathInput, locale?: string): string {
  return `${getCityPath(listing.city, listing.citySlug, locale)}/${listing.slug || listing.id}`;
}

export function getListingAbsoluteUrl(listing: ListingPathInput, locale?: string): string {
  return `${BASE_URL}${getListingPath(listing, locale)}`;
}

export function getListingClaimPath(listing: ListingPathInput, locale?: string): string {
  return `${getListingPath(listing, locale)}/claim`;
}

export function getListingClaimAbsoluteUrl(listing: ListingPathInput, locale?: string): string {
  return `${BASE_URL}${getListingClaimPath(listing, locale)}`;
}
