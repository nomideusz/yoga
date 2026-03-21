// ============================================================
// src/lib/search/resolver.ts
// ============================================================
// The key insight: the same query means different things on
// different pages. This module decides WHAT TO DO, not HOW
// to search. It returns an action that the page executes.
//
//   "hatha" on main page  → route to /category/hatha
//   "hatha" on city page  → filter schools in this city
//
//   "Kraków" on main page   → route to /krakow
//   "Kraków" on city page   → already here (or city switch)
//
// Processing pipeline:
//   1. Normalize
//   2. Strip stop words ("joga", "yoga", "szkoła jogi")
//   3. Detect & extract geo intent ("blisko", "near me")
//   4. Detect & extract postal code
//   5. Classify remaining tokens (city, style, unclassified)
//   6. Dispatch to page-specific logic

import { normalize, hasGeoIntent, stripGeoIntent, stripStopWords, isPostcode, polishCityStems } from './normalize';

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
  | { action: 'filter_postcode'; postcode: string; filter?: string }
  | { action: 'sort_by_distance'; filter?: string }
  | { action: 'show_all' }
  | { action: 'city_switch_prompt'; targetCity: string; targetSlug: string; styleFilter?: string; address?: string }
  | { action: 'already_here' }
  | { action: 'needs_server'; query: string }
  | { action: 'geocode_address'; address: string; citySlug: string };

/** Lookup tables loaded once at app startup from DB. */
export interface ResolverLookups {
  /** normalized city name → slug. e.g. "krakow" → "krakow" */
  cityMap: Map<string, string>;
  /** normalized style name/alias → slug. e.g. "hatha" → "hatha-yoga" */
  styleMap: Map<string, string>;
  /** citySlug → list of normalized district names */
  districtMap: Map<string, string[]>;
  /** citySlug → number of listed schools (0 = city exists but no schools) */
  citySchoolCount?: Map<string, number>;
  /** citySlug → { lat, lng, name } for ALL cities (including those with 0 schools) */
  cityGeo?: Map<string, { lat: number; lng: number; name: string }>;
  /** city name → Polish locative form (e.g. "Kraków" → "Krakowie") */
  cityLocative?: Map<string, string>;
}

// ── Main resolver ──────────────────────────────────────────

export function resolveSearch(
  raw: string,
  context: SearchContext,
  lookups: ResolverLookups
): SearchAction {
  const n = normalize(raw);
  if (!n) return { action: 'show_all' };

  // 1. Strip stop words
  let working = stripStopWords(n);
  if (!working) return { action: 'show_all' };

  // 2. Extract geo intent
  const geo = hasGeoIntent(raw);
  if (geo) {
    working = stripGeoIntent(working);
    if (!working) return { action: 'sort_by_distance' };
  }

  // 3. Extract postal code
  const postalMatch = working.match(/\b(\d{2})-?(\d{3})\b/);
  let postal: string | undefined;
  if (postalMatch) {
    postal = `${postalMatch[1]}-${postalMatch[2]}`;
    working = working.replace(postalMatch[0], '').replace(/\s+/g, ' ').trim();
  }

  // 4. If nothing remains after extraction
  if (!working) {
    if (geo) return { action: 'sort_by_distance' };
    if (postal) return { action: 'filter_postcode', postcode: postal };
    return { action: 'show_all' };
  }

  // 5. Tokenize and detect known entities
  const tokens = working.split(/\s+/).filter(Boolean);
  const city = matchToken(tokens, lookups.cityMap);
  const style = matchToken(tokens, lookups.styleMap);
  const rest = tokens.filter(
    t => t !== city?.matched && t !== style?.matched
  );

  // If we have a postal code + remaining tokens, combine
  if (postal && !city && !style) {
    return { action: 'filter_postcode', postcode: postal, filter: working };
  }
  if (postal) {
    // Postal + city/style: postal determines location, style/city as context
    if (city) {
      return { action: 'filter_postcode', postcode: postal, filter: style?.slug };
    }
    return { action: 'filter_postcode', postcode: postal, filter: style?.slug || rest.join(' ') };
  }

  // 6. Dispatch to page-specific logic
  let action: SearchAction;
  switch (context.page) {
    case 'main':  action = resolveMain(city, style, rest, lookups); break;
    case 'city':  action = resolveCity(city, style, rest, context, lookups); break;
    case 'style': action = resolveStyle(city, style, rest, context); break;
  }

  // 7. Overlay geo modifier
  if (geo) {
    // Geo intent + resolved action: wrap with sort_by_distance + filter
    if (action.action === 'route_to_city') {
      // Will land on city page, geo will be handled there
      return action;
    }
    if (action.action === 'filter') {
      return { action: 'sort_by_distance', filter: action.query };
    }
    if (action.action === 'route_to_style') {
      return { action: 'sort_by_distance', filter: action.styleSlug };
    }
    return { action: 'sort_by_distance', filter: working };
  }

  return action;
}

// ── Main page: router ──────────────────────────────────────
// Main page sends you somewhere. It doesn't show results itself.

function resolveMain(
  city: TokenMatch | null,
  style: TokenMatch | null,
  rest: string[],
  lookups: ResolverLookups
): SearchAction {
  // "hatha kraków" → city page with style filter
  if (city && style) {
    return { action: 'route_to_city', citySlug: city.slug, styleFilter: style.slug };
  }
  // "kraków" → city page
  if (city && rest.length === 0) {
    return { action: 'route_to_city', citySlug: city.slug };
  }
  // "kraków mokotów" — check if rest is a district of that city
  if (city && rest.length > 0) {
    const fullRest = rest.join(' ');
    const districts = lookups.districtMap.get(city.slug) ?? [];
    if (districts.some(d => matchesDistrict(fullRest, d))) {
      return { action: 'route_to_city', citySlug: city.slug, styleFilter: fullRest };
    }
    // Unclassified tokens with a city → likely a street/address → geocode
    return { action: 'geocode_address', address: fullRest, citySlug: city.slug };
  }
  if (city) {
    // city only — should not reach here due to rest.length === 0 check above
    return { action: 'route_to_city', citySlug: city.slug };
  }
  // "hatha" → style page
  if (style && rest.length === 0) {
    return { action: 'route_to_style', styleSlug: style.slug };
  }
  // "hatha beginners" → style page with city filter
  if (style) {
    return { action: 'route_to_style', styleSlug: style.slug, cityFilter: rest.join(' ') };
  }

  // No known entities — check if rest matches a district (route to most likely city)
  const fullQuery = rest.join(' ');
  for (const [citySlug, districts] of lookups.districtMap.entries()) {
    if (districts.some(d => matchesDistrict(fullQuery, d))) {
      return { action: 'route_to_city', citySlug, styleFilter: undefined };
    }
  }

  // Unresolved — needs server-side search
  return { action: 'needs_server', query: fullQuery };
}

// ── City page: workspace ───────────────────────────────────
// City is fixed. Search filters within it. Typing another city
// is a navigation intent, not a filter.

function resolveCity(
  city: TokenMatch | null,
  style: TokenMatch | null,
  rest: string[],
  ctx: { citySlug: string; cityName: string },
  lookups: ResolverLookups
): SearchAction {
  // Same city → ignore the city token, use rest
  if (city && city.slug === ctx.citySlug) {
    if (style) return { action: 'filter', query: style.matched };
    // Same city + unclassified rest → geocode as address in this city
    if (rest.length > 0) return { action: 'geocode_address', address: rest.join(' '), citySlug: ctx.citySlug };
    return { action: 'already_here' };
  }
  // Different city → prompt, don't silently switch
  if (city) {
    const address = rest.length > 0 ? rest.join(' ') : undefined;
    return {
      action: 'city_switch_prompt',
      targetCity: city.original,
      targetSlug: city.slug,
      styleFilter: style?.slug,
      address,
    };
  }
  // "hatha" → filter within this city (NOT route to style page)
  if (style) {
    if (rest.length > 0) {
      return { action: 'filter', query: `${style.matched} ${rest.join(' ')}` };
    }
    return { action: 'filter', query: style.matched };
  }
  // Check districts of this city
  const fullQuery = rest.join(' ');
  const districts = lookups.districtMap.get(ctx.citySlug) ?? [];
  const matchedDistrict = districts.find(
    d => matchesDistrict(fullQuery, normalize(d))
  );
  if (matchedDistrict) {
    return { action: 'filter_district', district: matchedDistrict };
  }

  // Unclassified tokens — could be school name, street, typo → needs server
  if (rest.length > 0) {
    return { action: 'needs_server', query: fullQuery };
  }

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

// ── Empty city helper ─────────────────────────────────────

/**
 * Find the nearest city with schools, given an empty city's slug.
 * Uses cityGeo (from cities table) to compute distances.
 * Returns null if the city has schools or if geo data is unavailable.
 */
export function findNearestCityWithSchools(
  citySlug: string,
  lookups: ResolverLookups,
): { slug: string; name: string; count: number; distanceKm: number } | null {
  if (!lookups.citySchoolCount || !lookups.cityGeo) return null;
  const count = lookups.citySchoolCount.get(citySlug) ?? 0;
  if (count > 0) return null; // city has schools

  const origin = lookups.cityGeo.get(citySlug);
  if (!origin) return null;

  let best: { slug: string; name: string; count: number; distanceKm: number } | null = null;
  let bestDist = Infinity;

  for (const [slug, geo] of lookups.cityGeo) {
    const sc = lookups.citySchoolCount.get(slug) ?? 0;
    if (sc === 0 || slug === citySlug) continue;

    const dlat = (geo.lat - origin.lat) * Math.PI / 180;
    const dlng = (geo.lng - origin.lng) * Math.PI / 180;
    const a = Math.sin(dlat / 2) ** 2 + Math.cos(origin.lat * Math.PI / 180) * Math.cos(geo.lat * Math.PI / 180) * Math.sin(dlng / 2) ** 2;
    const d = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (d < bestDist) {
      bestDist = d;
      best = { slug, name: geo.name, count: sc, distanceKm: Math.round(d) };
    }
  }
  return best;
}

// ── District matching helper ───────────────────────────────
// Must match on word boundaries to avoid "zwierzyniecka" matching
// district "zwierzyniec" via substring inclusion.

function matchesDistrict(query: string, district: string): boolean {
  if (query === district) return true;
  // Check if district appears as a whole word in the query
  const re = new RegExp(`(?:^|\\s)${district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`);
  return re.test(query);
}

// ── Token matching helper ──────────────────────────────────

interface TokenMatch {
  matched: string;   // the normalized token(s) that matched
  slug: string;      // URL slug
  original: string;  // display name (same as matched for now)
}

function matchToken(tokens: string[], lookup: Map<string, string>): TokenMatch | null {
  // Try bigrams first: "zielona gora" → 2 tokens
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    const slug = lookup.get(bigram);
    if (slug) return { matched: bigram, slug, original: bigram };
  }
  // Then single tokens (with Polish case-form stemming for city lookups)
  for (const t of tokens) {
    const slug = lookup.get(t);
    if (slug) return { matched: t, slug, original: t };
    // Try Polish declension stems: "lodzi" → "lodz" → matches Łódź
    for (const stem of polishCityStems(t)) {
      if (stem === t) continue;
      const stemSlug = lookup.get(stem);
      if (stemSlug) return { matched: t, slug: stemSlug, original: t };
    }
  }
  return null;
}
