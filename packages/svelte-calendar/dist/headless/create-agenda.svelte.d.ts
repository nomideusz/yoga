import type { TimelineEvent } from '../core/types.js';
import type { CalendarAdapter } from '../adapters/types.js';
export interface AgendaOptions {
    /** Data source (required). Can be a getter for reactive adapters. */
    adapter: CalendarAdapter | (() => CalendarAdapter);
    /** Initial date to focus on (default: today) */
    initialDate?: Date;
    /** BCP 47 locale tag (e.g. 'en-US', 'pl-PL') */
    locale?: string;
    /** Number of days to load ahead of focus date for the upcoming list (default: 7) */
    lookahead?: number;
}
export interface HeadlessAgenda {
    /** The focused date */
    readonly focusDate: Date;
    /** Start-of-day ms for focus date */
    readonly focusDayMs: number;
    /** Is the focus date today? */
    readonly isToday: boolean;
    /** Is the focus date in the past? */
    readonly isPast: boolean;
    /** Is the focus date in the future? */
    readonly isFuture: boolean;
    /** Formatted date label (e.g. "Monday, April 14") */
    readonly dateLabel: string;
    /** Whether the adapter is loading */
    readonly loading: boolean;
    /** All events for the focus day, sorted by start */
    readonly dayEvents: TimelineEvent[];
    /** All-day or multi-day events */
    readonly allDay: TimelineEvent[];
    /** Timed events that have ended (today only; empty for other days) */
    readonly past: TimelineEvent[];
    /** Timed events currently in progress */
    readonly current: TimelineEvent[];
    /** Timed events coming up */
    readonly upcoming: TimelineEvent[];
    /** Grouped upcoming slots (overlapping events merged) */
    readonly upcomingSlots: import('../views/shared/format.js').TimeSlot[];
    /** Total event count for the day */
    readonly count: number;
    /** Format a Date to locale time string (e.g. "2:30 PM" or "14:30") */
    fmtTime(date: Date): string;
    /** Format event duration (e.g. "1h 30m") */
    fmtDuration(event: TimelineEvent): string;
    /** Format time range (e.g. "14:00 – 15:30") */
    fmtRange(event: TimelineEvent): string;
    /** Time until event starts (e.g. "in 2h 15m") — live, updates every second */
    eta(event: TimelineEvent): string;
    /** Progress of an in-progress event (0–1) — live */
    progress(event: TimelineEvent): number;
    /** Go to previous day */
    prev(): void;
    /** Go to next day */
    next(): void;
    /** Go to today */
    goToday(): void;
    /** Set focus to a specific date */
    setDate(date: Date): void;
    /** Current epoch ms, ticks every second */
    readonly now: number;
    /** Formatted current time "HH:MM" */
    readonly timeLabel: string;
    /** Today's start-of-day ms */
    readonly todayMs: number;
}
export declare function createAgenda(options: AgendaOptions): HeadlessAgenda;
