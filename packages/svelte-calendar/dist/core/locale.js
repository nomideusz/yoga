/**
 * Locale-aware formatting utilities.
 *
 * All functions accept an optional `locale` string (BCP 47 tag, e.g. 'en-US',
 * 'pl-PL'). When omitted they fall back to `defaultLocale`.
 *
 * For date-fns locale integration later, this module can import from
 * `date-fns/locale/*` and pass to `format()`.
 */
import { DAY_MS } from './time.js';
/** English defaults — used unless overridden via `setLabels()`. */
export const defaultLabels = {
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    day: 'Day',
    week: 'Week',
    planner: 'Planner',
    agenda: 'Agenda',
    now: 'now',
    free: 'free',
    allDay: 'All day',
    done: 'Done',
    upNext: 'Up next',
    until: 'until',
    noEvents: 'No events',
    nothingScheduled: 'Nothing scheduled',
    nothingScheduledYet: 'Nothing scheduled yet',
    nothingWasScheduled: 'Nothing was scheduled',
    allDoneForToday: 'All done for today',
    goToToday: 'Go to today',
    previousDay: 'Previous day',
    nextDay: 'Next day',
    previousWeek: 'Previous week',
    nextWeek: 'Next week',
    calendar: 'Calendar',
    viewMode: 'View mode',
    dayNavigation: 'Day navigation',
    weekNavigation: 'Week navigation',
    dayPlanner: 'Day planner',
    scrollableDayPlanner: 'Scrollable day planner',
    todaysLineup: "Today's lineup",
    weekAhead: 'Week ahead',
    multiWeekGrid: 'Multi-week calendar grid',
    currentTime: 'Current time',
    createEvent: 'Create event',
    happeningNow: 'happening now',
    past: 'past',
    completed: 'completed',
    inProgress: 'in progress',
    nMore: (n) => `+${n} more`,
    nEvents: (n) => `${n} event${n === 1 ? '' : 's'}`,
    nCompleted: (n) => `${n} completed`,
    dayNOfTotal: (current, total) => `day ${current} of ${total}`,
    percentComplete: (pct) => `${pct}% complete`,
};
let _labels = { ...defaultLabels };
/** Replace one or more UI labels. Merges with current labels. */
export function setLabels(overrides) {
    _labels = { ..._labels, ...overrides };
}
/** Reset all labels to English defaults. */
export function resetLabels() {
    _labels = { ...defaultLabels };
}
/** Get the currently active labels. */
export function getLabels() {
    return _labels;
}
// ─── Default locale ─────────────────────────────────────
/** Module-level default locale — consumers can override via setDefaultLocale() */
let defaultLocale = 'en-US';
/** Change the default locale for all formatting functions */
export function setDefaultLocale(tag) {
    defaultLocale = tag;
}
/** Get the current default locale */
export function getDefaultLocale() {
    return defaultLocale;
}
/**
 * Detect whether the current locale uses 12-hour or 24-hour time.
 * Caches per locale tag for performance.
 */
const hourCycleCache = new Map();
export function is24HourLocale(locale) {
    const loc = locale ?? defaultLocale;
    if (hourCycleCache.has(loc))
        return hourCycleCache.get(loc);
    const sample = new Intl.DateTimeFormat(loc, { hour: 'numeric' }).resolvedOptions();
    const is24 = sample.hourCycle === 'h23' || sample.hourCycle === 'h24';
    hourCycleCache.set(loc, is24);
    return is24;
}
/** Format hour index (0-23) as compact label: 12h ("12a", "1p") or 24h ("0", "13") */
export function fmtH(h, locale) {
    if (is24HourLocale(locale)) {
        return String(h);
    }
    if (h === 0)
        return '12a';
    if (h === 12)
        return '12p';
    return h < 12 ? h + 'a' : h - 12 + 'p';
}
/** Short weekday name for a timestamp: "Mon", "Tue", etc. */
export function weekdayShort(ms, locale) {
    return new Date(ms).toLocaleDateString(locale ?? defaultLocale, { weekday: 'short' });
}
/** Long weekday name for a timestamp: "Monday", "Tuesday", etc. */
export function weekdayLong(ms, locale) {
    return new Date(ms).toLocaleDateString(locale ?? defaultLocale, { weekday: 'long' });
}
/** Short month name for a timestamp: "Jan", "Feb", etc. */
export function monthShort(ms, locale) {
    return new Date(ms).toLocaleDateString(locale ?? defaultLocale, { month: 'short' });
}
/** Long month name: "January", "February", etc. */
export function monthLong(ms, locale) {
    return new Date(ms).toLocaleDateString(locale ?? defaultLocale, { month: 'long' });
}
/** Short date: "Feb 21" */
export function dateShort(ms, locale) {
    return new Date(ms).toLocaleDateString(locale ?? defaultLocale, {
        month: 'short',
        day: 'numeric',
    });
}
/** Weekday + short date: "Mon, Feb 17" */
export function dateWithWeekday(ms, locale) {
    return new Date(ms).toLocaleDateString(locale ?? defaultLocale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}
/**
 * Format a timestamp as a smart day label:
 *   "Today · Feb 21", "Yesterday · Feb 20", "Mon, Feb 17", etc.
 */
export function fmtDay(ms, todayMs, opts, locale) {
    const loc = locale ?? defaultLocale;
    const short = new Date(ms).toLocaleDateString(loc, { month: 'short', day: 'numeric' });
    const L = _labels;
    if (ms === todayMs)
        return opts?.short ? L.today : `${L.today} · ${short}`;
    if (ms === todayMs - DAY_MS)
        return opts?.short ? L.yesterday : `${L.yesterday} · ${short}`;
    if (ms === todayMs + DAY_MS)
        return opts?.short ? L.tomorrow : `${L.tomorrow} · ${short}`;
    if (opts?.short) {
        return new Date(ms).toLocaleDateString(loc, { weekday: 'short', day: 'numeric' });
    }
    return new Date(ms).toLocaleDateString(loc, { weekday: 'short', month: 'short', day: 'numeric' });
}
/**
 * Format a week range label: "Feb 17 – 23, 2026" or "Jan 27 – Feb 2, 2026"
 */
export function fmtWeekRange(weekStartMs, locale) {
    const loc = locale ?? defaultLocale;
    const s = new Date(weekStartMs);
    const e = new Date(weekStartMs + 6 * DAY_MS);
    const sm = s.toLocaleDateString(loc, { month: 'short' });
    const em = e.toLocaleDateString(loc, { month: 'short' });
    const sy = s.getFullYear();
    const ey = e.getFullYear();
    if (sy !== ey) {
        return `${sm} ${s.getDate()}, ${sy} – ${em} ${e.getDate()}, ${ey}`;
    }
    if (sm !== em) {
        return `${sm} ${s.getDate()} – ${em} ${e.getDate()}, ${ey}`;
    }
    return `${sm} ${s.getDate()} – ${e.getDate()}, ${ey}`;
}
// ─── Shared time / duration formatting ──────────────────
/**
 * Format a Date as a compact time string.
 *
 * 12-hour locales → "9a", "12:30p"
 * 24-hour locales → "9:00", "14:30"
 */
export function fmtTime(d, locale) {
    if (is24HourLocale(locale)) {
        const h = d.getHours();
        const m = d.getMinutes();
        return `${h}:${String(m).padStart(2, '0')}`;
    }
    const h = d.getHours();
    const m = d.getMinutes();
    const suffix = h >= 12 ? 'p' : 'a';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}
/**
 * Format the duration between two Dates as a compact string.
 * e.g. "45m", "1h", "1h 30m"
 */
export function fmtDuration(start, end) {
    const mins = Math.round((end.getTime() - start.getTime()) / 60_000);
    if (mins < 60)
        return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
