import type { CalendarAdapter } from './types.js';
/**
 * A recurring event definition.
 *
 * Backward-compatible: the only required fields are `id`, `title`,
 * `startTime`, `endTime`, and `dayOfWeek` (for weekly, the default).
 */
export interface RecurringEvent {
    id: string;
    title: string;
    /** Start time in "HH:MM" 24-hour format */
    startTime: string;
    /** End time in "HH:MM" 24-hour format */
    endTime: string;
    /** Recurrence frequency (default: `'weekly'`) */
    frequency?: 'daily' | 'weekly' | 'monthly';
    /**
     * Repeat every N periods — e.g. `2` with `weekly` = biweekly.
     * Requires `startDate` when > 1 so the adapter knows the anchor.
     * @default 1
     */
    interval?: number;
    /**
     * ISO weekday(s): 1 = Monday … 7 = Sunday.
     * Required for `weekly` frequency. Pass an array for multiple days
     * (e.g. `[1, 3, 5]` for Mon/Wed/Fri).
     */
    dayOfWeek?: number | number[];
    /**
     * Day of month (1–31). Required for `monthly` frequency.
     * Clamped to the last day of shorter months (e.g. 31 → 28 in Feb).
     * @default 1
     */
    dayOfMonth?: number;
    /**
     * First possible occurrence in `"YYYY-MM-DD"` format.
     * Events before this date are excluded. Required when using
     * `interval > 1` or `count`.
     */
    startDate?: string;
    /**
     * Last possible occurrence in `"YYYY-MM-DD"` format.
     * No events are generated after this date.
     */
    until?: string;
    /**
     * Maximum number of occurrences, counted from `startDate`.
     * Alternative to `until` — if both are set the stricter bound wins.
     * Requires `startDate`.
     */
    count?: number;
    /** Accent color */
    color?: string;
    /** Optional subtitle displayed below the title */
    subtitle?: string;
    /** Optional tags displayed as small pills */
    tags?: string[];
    /** Category for grouping */
    category?: string;
    /** Location or room name */
    location?: string;
    /** Resource ID for multi-resource views */
    resourceId?: string;
    /** Arbitrary payload */
    data?: Record<string, unknown>;
}
export interface RecurringAdapterOptions {
    /** Start weeks on Monday (default: true) */
    mondayStart?: boolean;
    /**
     * Custom color palette for auto-coloring events.
     * Pass `generatePalette('#yourAccent')` to get theme-harmonious colors,
     * or provide your own array of hex strings.
     * Defaults to the built-in vivid palette.
     */
    palette?: string[];
}
/**
 * Create a CalendarAdapter that projects recurring events onto concrete
 * dates for whatever range the calendar requests.
 *
 * Events without a `color` are auto-assigned one from a vivid palette,
 * grouped by `category` or `title` so related events share a color.
 *
 * Read-only by default — create/update/delete throw.
 */
export declare function createRecurringAdapter(schedule: RecurringEvent[], options?: RecurringAdapterOptions): CalendarAdapter;
