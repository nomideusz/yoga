export const LEGACY_STYLE_REDIRECTS: Readonly<Record<string, string>> = {
  "pilates": "pilates-reformer",
  "yin-restorative": "restorative",
};

export const SEO_PAGE_SIZE = 24;
export const MIN_STYLE_CITY_LISTINGS = 3;

export function getCanonicalStyleSlug(slug: string): string {
  return LEGACY_STYLE_REDIRECTS[slug] ?? slug;
}
