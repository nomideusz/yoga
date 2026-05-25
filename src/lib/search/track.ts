// src/lib/search/track.ts — Yoga search tracker
import { createTracker, type TrackSearchEvent as BaseTrackSearchEvent } from '@nomideusz/svelte-search';
import { trackSearch as trackUmamiSearch } from '$lib/analytics/umami.js';

const tracker = createTracker({
  endpoint: '/api/search-events',
  sessionKey: 'asini_search_sid',
});

/** Yoga-specific event with cityContext alias */
export interface TrackSearchEvent extends Omit<BaseTrackSearchEvent, 'locationContext'> {
  cityContext?: string;
  locationContext?: string;
}

export function trackSearch(event: TrackSearchEvent): void {
  const { cityContext, ...rest } = event;
  tracker.track({
    ...rest,
    locationContext: cityContext ?? rest.locationContext,
  });

  trackUmamiSearch({
    query: event.query,
    action: event.action,
    layer: event.layer,
    page: event.page,
    resultType: event.clickedType,
    city: cityContext ?? rest.locationContext,
    resultCount: event.resultCount,
  });
}
