/**
 * Shared context reader for calendar views.
 *
 * Calendar.svelte sets a single 'calendar' context with reactive getters.
 * This module reads it and returns a typed interface for views.
 */
import { getContext } from 'svelte';
import { sod } from '../../core/time.js';
/**
 * Read the calendar context.
 * Call at component init time (top-level script).
 * Returns an object with getters that delegate to the raw context.
 */
export function useCalendarContext() {
    const raw = getContext('calendar');
    return {
        get viewState() { return raw?.viewState; },
        get drag() { return raw?.drag; },
        get commitDrag() { return raw?.commitDrag; },
        get snapInterval() { return raw?.snapInterval ?? 15; },
        get showNav() { return raw?.showNavigation ?? true; },
        get equalDays() { return raw?.equalDays ?? false; },
        get showDates() { return raw?.showDates ?? true; },
        get hideDays() { return raw?.hideDays; },
        get isMobile() { return raw?.mobile ?? false; },
        get autoHeight() { return raw?.autoHeight ?? false; },
        get compact() { return raw?.compact ?? false; },
        get readOnly() { return raw?.readOnly ?? false; },
        get blockedSlots() { return raw?.blockedSlots; },
        get dayHeaderSnippet() { return raw?.dayHeaderSnippet; },
        get minDuration() { return raw?.minDuration; },
        get maxDuration() { return raw?.maxDuration; },
        get oneventhover() { return raw?.oneventhover; },
        get disabledDates() { return raw?.disabledDates; },
        get disabledSet() { return new Set(raw?.disabledDates?.map(d => sod(d.getTime())) ?? []); },
        get loadRange() {
            if (!raw)
                return undefined;
            return {
                get current() { return raw.loadRange; },
                set: (r) => raw.setLoadRange(r),
            };
        },
        get eventSnippet() { return raw?.eventSnippet; },
        get emptySnippet() { return raw?.emptySnippet; },
    };
}
