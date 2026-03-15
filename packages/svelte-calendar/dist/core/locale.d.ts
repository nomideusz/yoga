/**
 * Locale-aware formatting utilities.
 *
 * All functions accept an optional `locale` string (BCP 47 tag, e.g. 'en-US',
 * 'pl-PL'). When omitted they fall back to `defaultLocale`.
 *
 * For date-fns locale integration later, this module can import from
 * `date-fns/locale/*` and pass to `format()`.
 */
/**
 * All user-visible text in the calendar UI.
 * Override via `setLabels()` for full localisation.
 */
export interface CalendarLabels {
    today: string;
    yesterday: string;
    tomorrow: string;
    day: string;
    week: string;
    planner: string;
    agenda: string;
    now: string;
    free: string;
    allDay: string;
    done: string;
    upNext: string;
    until: string;
    noEvents: string;
    nothingScheduled: string;
    nothingScheduledYet: string;
    nothingWasScheduled: string;
    allDoneForToday: string;
    goToToday: string;
    previousDay: string;
    nextDay: string;
    previousWeek: string;
    nextWeek: string;
    calendar: string;
    viewMode: string;
    dayNavigation: string;
    weekNavigation: string;
    dayPlanner: string;
    scrollableDayPlanner: string;
    todaysLineup: string;
    weekAhead: string;
    multiWeekGrid: string;
    currentTime: string;
    createEvent: string;
    happeningNow: string;
    past: string;
    completed: string;
    inProgress: string;
    /** e.g. "+3 more" */
    nMore: (n: number) => string;
    /** e.g. "5 events" */
    nEvents: (n: number) => string;
    /** e.g. "3 completed" */
    nCompleted: (n: number) => string;
    /** e.g. "day 2 of 4" */
    dayNOfTotal: (current: number, total: number) => string;
    /** e.g. "75% complete" */
    percentComplete: (pct: number) => string;
}
/** English defaults — used unless overridden via `setLabels()`. */
export declare const defaultLabels: CalendarLabels;
/** Replace one or more UI labels. Merges with current labels. */
export declare function setLabels(overrides: Partial<CalendarLabels>): void;
/** Reset all labels to English defaults. */
export declare function resetLabels(): void;
/** Get the currently active labels. */
export declare function getLabels(): Readonly<CalendarLabels>;
/** Change the default locale for all formatting functions */
export declare function setDefaultLocale(tag: string): void;
/** Get the current default locale */
export declare function getDefaultLocale(): string;
export declare function is24HourLocale(locale?: string): boolean;
/** Format hour index (0-23) as compact label: 12h ("12a", "1p") or 24h ("0", "13") */
export declare function fmtH(h: number, locale?: string): string;
/** Short weekday name for a timestamp: "Mon", "Tue", etc. */
export declare function weekdayShort(ms: number, locale?: string): string;
/** Long weekday name for a timestamp: "Monday", "Tuesday", etc. */
export declare function weekdayLong(ms: number, locale?: string): string;
/** Short month name for a timestamp: "Jan", "Feb", etc. */
export declare function monthShort(ms: number, locale?: string): string;
/** Long month name: "January", "February", etc. */
export declare function monthLong(ms: number, locale?: string): string;
/** Short date: "Feb 21" */
export declare function dateShort(ms: number, locale?: string): string;
/** Weekday + short date: "Mon, Feb 17" */
export declare function dateWithWeekday(ms: number, locale?: string): string;
/**
 * Format a timestamp as a smart day label:
 *   "Today · Feb 21", "Yesterday · Feb 20", "Mon, Feb 17", etc.
 */
export declare function fmtDay(ms: number, todayMs: number, opts?: {
    short?: boolean;
}, locale?: string): string;
/**
 * Format a week range label: "Feb 17 – 23, 2026" or "Jan 27 – Feb 2, 2026"
 */
export declare function fmtWeekRange(weekStartMs: number, locale?: string): string;
/**
 * Format a Date as a compact time string.
 *
 * 12-hour locales → "9a", "12:30p"
 * 24-hour locales → "9:00", "14:30"
 */
export declare function fmtTime(d: Date, locale?: string): string;
/**
 * Format the duration between two Dates as a compact string.
 * e.g. "45m", "1h", "1h 30m"
 */
export declare function fmtDuration(start: Date, end: Date): string;
