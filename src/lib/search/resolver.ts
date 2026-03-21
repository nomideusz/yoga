// ============================================================
// src/lib/search/resolver.ts — Yoga-specific search resolver
// ============================================================
// Uses @nomideusz/svelte-search's parseQuery for token classification,
// then applies yoga-specific page dispatch logic.

import { parseQuery, findMatchingArea, findNearestLocationWithEntities } from '@nomideusz/svelte-search';
import { plLocale } from '@nomideusz/svelte-search/locales/pl';
import type { YogaResolverLookups as ResolverLookups } from './types';

// ── Yoga-specific types ────────────────────────────────────

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



// ── Main resolver ──────────────────────────────────────────

export function resolveSearch(
  raw: string,
  context: SearchContext,
  lookups: ResolverLookups
): SearchAction {
  const parsed = parseQuery(raw, lookups, plLocale);

  if (!parsed.normalized || !parsed.working) {
    if (parsed.geoIntent) return { action: 'sort_by_distance' };
    return { action: 'show_all' };
  }

  // Handle postal code early
  if (parsed.postal && !parsed.working) {
    if (parsed.geoIntent) return { action: 'sort_by_distance' };
    return { action: 'filter_postcode', postcode: parsed.postal };
  }

  if (parsed.postal) {
    if (parsed.location) {
      return { action: 'filter_postcode', postcode: parsed.postal, filter: parsed.category?.slug };
    }
    return { action: 'filter_postcode', postcode: parsed.postal, filter: parsed.category?.slug || parsed.rest.join(' ') };
  }

  // Map generic token matches to yoga city/style
  const city = parsed.location;
  const style = parsed.category;
  const rest = parsed.rest;

  // Dispatch to page-specific logic
  let action: SearchAction;
  switch (context.page) {
    case 'main':  action = resolveMain(city, style, rest, lookups); break;
    case 'city':  action = resolveCity(city, style, rest, context, lookups); break;
    case 'style': action = resolveStyle(city, style, rest, context); break;
  }

  // Overlay geo modifier
  if (parsed.geoIntent) {
    if (action.action === 'route_to_city') return action;
    if (action.action === 'filter') return { action: 'sort_by_distance', filter: action.query };
    if (action.action === 'route_to_style') return { action: 'sort_by_distance', filter: action.styleSlug };
    return { action: 'sort_by_distance', filter: parsed.working };
  }

  return action;
}

// ── Token match helper type ────────────────────────────────

interface TokenMatch {
  matched: string;
  slug: string;
  original: string;
}

// ── Main page ──────────────────────────────────────────────

function resolveMain(
  city: TokenMatch | null,
  style: TokenMatch | null,
  rest: string[],
  lookups: ResolverLookups
): SearchAction {
  if (city && style) {
    return { action: 'route_to_city', citySlug: city.slug, styleFilter: style.slug };
  }
  if (city && rest.length === 0) {
    return { action: 'route_to_city', citySlug: city.slug };
  }
  if (city && rest.length > 0) {
    const fullRest = rest.join(' ');
    const area = findMatchingArea(fullRest, city.slug, lookups, plLocale);
    if (area) return { action: 'route_to_city', citySlug: city.slug, styleFilter: fullRest };
    return { action: 'geocode_address', address: fullRest, citySlug: city.slug };
  }
  if (city) {
    return { action: 'route_to_city', citySlug: city.slug };
  }
  if (style && rest.length === 0) {
    return { action: 'route_to_style', styleSlug: style.slug };
  }
  if (style) {
    return { action: 'route_to_style', styleSlug: style.slug, cityFilter: rest.join(' ') };
  }

  // Check if rest matches a district
  const fullQuery = rest.join(' ');
  for (const [locSlug, areas] of lookups.areaMap.entries()) {
    if (areas.some(a => matchesArea(fullQuery, a))) {
      return { action: 'route_to_city', citySlug: locSlug };
    }
  }

  return { action: 'needs_server', query: fullQuery };
}

// ── City page ──────────────────────────────────────────────

function resolveCity(
  city: TokenMatch | null,
  style: TokenMatch | null,
  rest: string[],
  ctx: { citySlug: string; cityName: string },
  lookups: ResolverLookups
): SearchAction {
  if (city && city.slug === ctx.citySlug) {
    if (style) return { action: 'filter', query: style.matched };
    if (rest.length > 0) return { action: 'geocode_address', address: rest.join(' '), citySlug: ctx.citySlug };
    return { action: 'already_here' };
  }
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
  if (style) {
    if (rest.length > 0) return { action: 'filter', query: `${style.matched} ${rest.join(' ')}` };
    return { action: 'filter', query: style.matched };
  }

  const fullQuery = rest.join(' ');
  const areas = lookups.areaMap.get(ctx.citySlug) ?? [];
  const matchedArea = areas.find(a => matchesArea(fullQuery, a));
  if (matchedArea) return { action: 'filter_district', district: matchedArea };

  if (rest.length > 0) return { action: 'needs_server', query: fullQuery };
  return { action: 'filter', query: fullQuery };
}

// ── Style page ─────────────────────────────────────────────

function resolveStyle(
  city: TokenMatch | null,
  style: TokenMatch | null,
  rest: string[],
  ctx: { styleSlug: string }
): SearchAction {
  if (city) {
    return { action: 'route_to_city', citySlug: city.slug, styleFilter: ctx.styleSlug };
  }
  if (style && style.slug === ctx.styleSlug) {
    if (rest.length > 0) return { action: 'filter', query: rest.join(' ') };
    return { action: 'already_here' };
  }
  if (style) {
    return { action: 'route_to_style', styleSlug: style.slug };
  }
  return { action: 'filter', query: rest.join(' ') };
}

// ── Helpers ────────────────────────────────────────────────

function matchesArea(query: string, area: string): boolean {
  if (query === area) return true;
  const re = new RegExp(`(?:^|\\s)${area.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`);
  return re.test(query);
}

/**
 * Find nearest city with schools — yoga-specific wrapper.
 */
export function findNearestCityWithSchools(
  citySlug: string,
  lookups: ResolverLookups,
): { city: string; name: string; slug: string; distanceKm: number; count: number } | null {
  if (!lookups.locationEntityCount || !lookups.locationGeo) return null;
  const count = lookups.locationEntityCount.get(citySlug) ?? 0;
  if (count > 0) return null;

  const origin = lookups.locationGeo.get(citySlug);
  if (!origin) return null;

  const result = findNearestLocationWithEntities(origin.lat, origin.lng, lookups, citySlug);
  if (!result) return null;
  return { city: result.name, name: result.name, slug: result.slug, distanceKm: result.distanceKm, count: result.count };
}
