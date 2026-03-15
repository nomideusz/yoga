// ============================================================
// src/lib/search/resolver.ts
// ============================================================
// The key insight: the same query means different things on
// different pages. This module decides WHAT TO DO, not HOW
// to search. It returns an action that the page executes.
//
//   "hatha" on main page  → route to /hatha-yoga
//   "hatha" on city page  → filter schools in this city
//   "hatha" on style page → you're already here
//
//   "Kraków" on main page   → route to /yoga-krakow
//   "Kraków" on city page   → already here (or city switch)
//   "Kraków" on style page  → route to /yoga-krakow?s=hatha

import { normalize, hasGeoIntent, isPostcode } from './normalize';

// ── Types ──────────────────────────────────────────────────

export type SearchContext =
  | { page: 'main' }
  | { page: 'city'; citySlug: string; cityName: string }
  | { page: 'style'; styleSlug: string; styleName: string };

export type SearchAction =
  | { action: 'route_to_city'; citySlug: string; styleFilter?: string }
  | { action: 'route_to_style'; styleSlug: string; cityFilter?: string }
  | { action: 'route_to_school'; schoolSlug: string }
  | { action: 'filter'; query: string }
  | { action: 'filter_district'; district: string }
  | { action: 'filter_postcode'; postcode: string }
  | { action: 'sort_by_distance' }
  | { action: 'show_all' }
  | { action: 'city_switch_prompt'; targetCity: string; targetSlug: string }
  | { action: 'already_here' };

/** Lookup tables loaded once at app startup from DB. */
export interface ResolverLookups {
  /** normalized city name → slug. e.g. "krakow" → "krakow" */
  cityMap: Map<string, string>;
  /** normalized style name/alias → slug. e.g. "hatha" → "hatha-yoga" */
  styleMap: Map<string, string>;
  /** citySlug → list of normalized district names */
  districtMap: Map<string, string[]>;
}

// ── Main resolver ──────────────────────────────────────────

export function resolveSearch(
  raw: string,
  context: SearchContext,
  lookups: ResolverLookups
): SearchAction {
  const n = normalize(raw);
  if (!n) return { action: 'show_all' };

  // Universal: geo intent → sort by distance (works on any page)
  if (hasGeoIntent(raw)) return { action: 'sort_by_distance' };

  // Universal: postcode → filter
  if (isPostcode(n.replace(/-/g, ''))) {
    const clean = n.replace(/\s/g, '').replace(/^(\d{2})(\d{3})$/, '$1-$2');
    return { action: 'filter_postcode', postcode: clean };
  }

  // Tokenize and detect known entities
  const tokens = n.split(/\s+/);
  const city = matchToken(tokens, lookups.cityMap);
  const style = matchToken(tokens, lookups.styleMap);
  const rest = tokens.filter(
    t => t !== city?.matched && t !== style?.matched
  );

  // Dispatch to page-specific logic
  switch (context.page) {
    case 'main':  return resolveMain(city, style, rest);
    case 'city':  return resolveCity(city, style, rest, context, lookups);
    case 'style': return resolveStyle(city, style, rest, context);
  }
}

// ── Main page: router ──────────────────────────────────────
// Main page sends you somewhere. It doesn't show results itself.

function resolveMain(
  city: TokenMatch | null,
  style: TokenMatch | null,
  rest: string[]
): SearchAction {
  // "hatha kraków" → city page with style filter
  if (city && style) {
    return { action: 'route_to_city', citySlug: city.slug, styleFilter: style.slug };
  }
  // "kraków" → city page
  if (city && rest.length === 0) {
    return { action: 'route_to_city', citySlug: city.slug };
  }
  // "kraków mokotów" → city page with extra filter
  if (city) {
    return { action: 'route_to_city', citySlug: city.slug, styleFilter: rest.join(' ') };
  }
  // "hatha" → style page
  if (style && rest.length === 0) {
    return { action: 'route_to_style', styleSlug: style.slug };
  }
  // "hatha beginners" → style page (extra tokens become filter)
  if (style) {
    return { action: 'route_to_style', styleSlug: style.slug, cityFilter: rest.join(' ') };
  }
  // Anything else (school name, unknown text) → search globally on main page
  return { action: 'filter', query: rest.join(' ') || '' };
}

// ── City page: workspace ───────────────────────────────────
// City is fixed. Search filters within it. Typing another city
// is a navigation intent, not a filter.

function resolveCity(
  city: TokenMatch | null,
  style: TokenMatch | null,
  rest: string[],
  ctx: { citySlug: string },
  lookups: ResolverLookups
): SearchAction {
  // Same city → ignore the city token, use rest
  if (city && city.slug === ctx.citySlug) {
    if (style) return { action: 'filter', query: style.matched };
    if (rest.length > 0) return { action: 'filter', query: rest.join(' ') };
    return { action: 'already_here' };
  }
  // Different city → prompt, don't silently switch
  if (city) {
    return { action: 'city_switch_prompt', targetCity: city.original, targetSlug: city.slug };
  }
  // "hatha" → filter within this city (NOT route to style page)
  if (style) {
    return { action: 'filter', query: style.matched };
  }
  // Check districts of this city
  const fullQuery = rest.join(' ');
  const districts = lookups.districtMap.get(ctx.citySlug) ?? [];
  const matchedDistrict = districts.find(
    d => normalize(d) === fullQuery || fullQuery.includes(normalize(d))
  );
  if (matchedDistrict) {
    return { action: 'filter_district', district: matchedDistrict };
  }
  // Default: free text filter within city
  return { action: 'filter', query: fullQuery };
}

// ── Style page: workspace ──────────────────────────────────
// Style is fixed. Search filters by city or school name.

function resolveStyle(
  city: TokenMatch | null,
  style: TokenMatch | null,
  rest: string[],
  ctx: { styleSlug: string }
): SearchAction {
  // "kraków" → city page with current style pre-applied
  if (city) {
    return { action: 'route_to_city', citySlug: city.slug, styleFilter: ctx.styleSlug };
  }
  // Same style → already here
  if (style && style.slug === ctx.styleSlug) {
    if (rest.length > 0) return { action: 'filter', query: rest.join(' ') };
    return { action: 'already_here' };
  }
  // Different style → go to that style page
  if (style) {
    return { action: 'route_to_style', styleSlug: style.slug };
  }
  // Anything else → filter school list on this style page
  return { action: 'filter', query: rest.join(' ') };
}

// ── Token matching helper ──────────────────────────────────

interface TokenMatch {
  matched: string;   // the normalized token(s) that matched
  slug: string;      // URL slug
  original: string;  // display name
}

function matchToken(tokens: string[], lookup: Map<string, string>): TokenMatch | null {
  // Try bigrams first: "zielona gora" → 2 tokens
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    const slug = lookup.get(bigram);
    if (slug) return { matched: bigram, slug, original: bigram };
  }
  // Then single tokens
  for (const t of tokens) {
    const slug = lookup.get(t);
    if (slug) return { matched: t, slug, original: t };
  }
  return null;
}
