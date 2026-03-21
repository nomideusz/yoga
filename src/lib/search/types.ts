// src/lib/search/types.ts — Yoga-specific search types
// Extends the generic ResolverLookups with yoga's convenience aliases.

import type { ResolverLookups as BaseResolverLookups } from '@nomideusz/svelte-search';

/** Yoga lookups: generic names + yoga-specific aliases for backward compat */
export interface YogaResolverLookups extends BaseResolverLookups {
  /** Alias for locationMap */
  cityMap: Map<string, string>;
  /** Alias for categoryMap */
  styleMap: Map<string, string>;
  /** Alias for locationEntityCount */
  citySchoolCount?: Map<string, number>;
  /** Alias for locationGeo */
  cityGeo?: Map<string, { lat: number; lng: number; name: string }>;
  /** City name → Polish locative form */
  cityLocative?: Map<string, string>;
}
