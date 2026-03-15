/**
 * Reactive view state — tracks which view is active, the current date range,
 * and navigation (prev/next/today).
 *
 * Usage:
 *   const vs = createViewState({ view: 'week-terrain' });
 *   vs.view        — current view id
 *   vs.focusDate   — the center date
 *   vs.range       — { start, end } for the current view window
 *   vs.next()      — advance one period (day/week depending on view)
 *   vs.prev()      — go back one period
 *   vs.goToday()   — jump to today
 */
import { startOfWeek as calcStartOfWeek, addDaysMs, DAY_MS } from '../core/time.js';
function inferMode(view) {
    if (view.startsWith('day'))
        return 'day';
    return 'week';
}
function computeRange(focus, mode, mondayStart, dayCount = 7) {
    if (mode === 'day') {
        const start = new Date(focus);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + DAY_MS);
        return { start, end };
    }
    // week / custom period
    if (dayCount === 7) {
        const ws = calcStartOfWeek(focus.getTime(), mondayStart);
        return {
            start: new Date(ws),
            end: new Date(addDaysMs(ws, 7)),
        };
    }
    // Custom day count: start from sod of focus
    const start = new Date(focus);
    start.setHours(0, 0, 0, 0);
    return {
        start,
        end: new Date(start.getTime() + dayCount * DAY_MS),
    };
}
export function createViewState(options = {}) {
    let view = $state(options.view ?? 'week-planner');
    let focusDate = $state(options.initialDate ?? new Date());
    let mondayStart = $state(options.mondayStart ?? true);
    let dayCount = $state(options.dayCount ?? 7);
    const timezone = options.timezone;
    const modeResolver = options.modeForView;
    const mode = $derived(modeResolver?.(view) ?? inferMode(view));
    const range = $derived(computeRange(focusDate, mode, mondayStart, dayCount));
    return {
        get view() {
            return view;
        },
        get focusDate() {
            return focusDate;
        },
        get range() {
            return range;
        },
        get mode() {
            return mode;
        },
        get mondayStart() {
            return mondayStart;
        },
        get timezone() {
            return timezone;
        },
        get dayCount() {
            return dayCount;
        },
        setView(id) {
            view = id;
        },
        setMondayStart(value) {
            mondayStart = value;
        },
        setFocusDate(date) {
            focusDate = date;
        },
        setDayCount(n) {
            dayCount = n;
        },
        next() {
            const days = mode === 'day' ? 1 : dayCount;
            focusDate = new Date(addDaysMs(focusDate.getTime(), days));
        },
        prev() {
            const days = mode === 'day' ? -1 : -dayCount;
            focusDate = new Date(addDaysMs(focusDate.getTime(), days));
        },
        goToday() {
            focusDate = new Date();
        },
    };
}
