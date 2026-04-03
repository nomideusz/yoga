/**
 * Types for the headless calendar API.
 *
 * The headless API gives users full control over rendering.
 * They get reactive state, computed layouts, and actions — zero DOM.
 */
import type { CalendarAdapter } from '../adapters/types.js';
import type { TimelineEvent, BlockedSlot } from '../core/types.js';
import type { DaySegment } from '../core/time.js';
import type { CalendarViewId } from '../engine/view-state.svelte.js';
import type { EventStore } from '../engine/event-store.svelte.js';
import type { ViewState } from '../engine/view-state.svelte.js';
import type { Selection } from '../engine/selection.svelte.js';
import type { DragState } from '../engine/drag.svelte.js';
import type { Clock } from '../core/clock.svelte.js';
export interface HeadlessCalendarOptions {
    /** Data source (required) */
    adapter: CalendarAdapter;
    /** Initial view ID (default: 'week-planner') */
    view?: CalendarViewId;
    /** Start week on Monday (default: true) */
    mondayStart?: boolean;
    /** Initial date to focus on (default: today) */
    initialDate?: Date;
    /** BCP 47 locale tag (e.g. 'en-US', 'pl-PL') */
    locale?: string;
    /** Visible hour range [startHour, endHour). Default: [0, 24] */
    visibleHours?: [number, number];
    /** Drag snap interval in minutes (default: 15) */
    snapInterval?: number;
    /** Treat all days equally — no past dimming (default: false) */
    equalDays?: boolean;
    /** ISO weekdays to hide (1=Mon … 7=Sun) */
    hideDays?: number[];
    /** Blocked/unavailable time slots */
    blockedSlots?: BlockedSlot[];
    /** Specific dates to disable */
    disabledDates?: Date[];
    /** Days per period in week mode (default: 7) */
    days?: number;
    /** Read-only mode: disables create/move (default: false) */
    readOnly?: boolean;
    /** Minimum event duration in minutes */
    minDuration?: number;
    /** Maximum event duration in minutes */
    maxDuration?: number;
    oneventclick?: (event: TimelineEvent) => void;
    oneventcreate?: (range: {
        start: Date;
        end: Date;
    }) => void;
    oneventmove?: (event: TimelineEvent, newStart: Date, newEnd: Date) => void;
}
export interface HeadlessDay {
    /** Start-of-day timestamp (ms) */
    ms: number;
    /** Date object for this day */
    date: Date;
    /** Day of month (1–31) */
    dayNum: number;
    /** ISO weekday (1=Mon … 7=Sun) */
    weekday: number;
    /** Is this today? */
    isToday: boolean;
    /** Is this day in the past? (respects equalDays) */
    isPast: boolean;
    /** Is this a weekend day (Sat/Sun)? */
    isWeekend: boolean;
    /** Is this day disabled? */
    isDisabled: boolean;
    /** Is this the 1st of the month? */
    isFirstOfMonth: boolean;
    /** Timed events for this day, sorted by start */
    events: TimelineEvent[];
    /** All-day / multi-day event segments */
    allDaySegments: DaySegment[];
}
export interface HeadlessWeek {
    /** Start of this period (ms) */
    periodStart: number;
    /** Does this period contain today? */
    isCurrent: boolean;
    /** Days in this period */
    days: HeadlessDay[];
}
/** Categorized events for today (Queue layout data) */
export interface TodayQueue {
    /** Events that have already ended */
    past: TimelineEvent[];
    /** Events currently in progress */
    current: TimelineEvent[];
    /** Events coming up, sorted by start */
    upcoming: TimelineEvent[];
}
export interface HeaderContext {
    /** Formatted date label for current view */
    dateLabel: string;
    /** Current mode */
    mode: 'day' | 'week';
    /** Available modes */
    modes: ('day' | 'week')[];
    /** Switch to a different mode */
    switchMode: (mode: 'day' | 'week') => void;
    /** Go to previous period */
    prev: () => void;
    /** Go to next period */
    next: () => void;
    /** Go to today */
    goToday: () => void;
    /** Whether the current view includes today */
    isViewOnToday: boolean;
    /** Current focus date */
    focusDate: Date;
}
export interface NavigationContext {
    prev: () => void;
    next: () => void;
    goToday: () => void;
    isViewOnToday: boolean;
    focusDate: Date;
    mode: 'day' | 'week';
}
export interface HeadlessCalendar {
    /** All loaded events for the current range */
    readonly events: TimelineEvent[];
    /** Whether the adapter is currently loading */
    readonly loading: boolean;
    /** The currently focused date */
    readonly focusDate: Date;
    /** Current mode: 'day' or 'week' */
    readonly mode: 'day' | 'week';
    /** Current view ID */
    readonly view: CalendarViewId;
    /** Visible date range */
    readonly range: {
        start: Date;
        end: Date;
    };
    /** Today's start-of-day (ms) */
    readonly today: number;
    /** Current timestamp (ms), ticks every second */
    readonly now: number;
    /** Formatted current time "HH:MM" */
    readonly timeLabel: string;
    /** Formatted seconds ":SS" */
    readonly secondsLabel: string;
    /** Currently selected event ID */
    readonly selectedEventId: string | null;
    /** Days in the current view range, each with events attached */
    readonly days: HeadlessDay[];
    /** Same days grouped into week-sized periods */
    readonly weeks: HeadlessWeek[];
    /** Visible hour numbers (e.g. [0,1,...,23] or [9,10,...,17]) */
    readonly hours: number[];
    /** Categorized events for today (past/current/upcoming) */
    readonly todayQueue: TodayQueue;
    readonly mondayStart: boolean;
    readonly locale: string | undefined;
    readonly readOnly: boolean;
    readonly dayCount: number;
    prev(): void;
    next(): void;
    goToday(): void;
    setView(id: CalendarViewId): void;
    setFocusDate(date: Date): void;
    setMondayStart(v: boolean): void;
    setDayCount(n: number): void;
    selectEvent(id: string | null): void;
    clearSelection(): void;
    /** Start dragging an existing event to move it */
    beginDragMove(eventId: string, start: Date, end: Date): void;
    /** Start drag-creating a new event */
    beginDragCreate(start: Date, end: Date): void;
    /** Update drag pointer position */
    updateDrag(start: Date, end: Date): void;
    /**
     * Commit the current drag operation.
     * Validates against min/max duration, blocked slots, disabled dates.
     * For moves: calls store.move() + oneventmove callback.
     * For creates: calls oneventcreate callback.
     * Returns the validated payload, or null if rejected.
     */
    commitDrag(): Promise<{
        start: Date;
        end: Date;
        eventId?: string;
    } | null>;
    /** Cancel the current drag */
    cancelDrag(): void;
    /** Whether a drag is in progress */
    readonly isDragging: boolean;
    /** Current drag payload (snapped times) */
    readonly dragPayload: {
        start: Date;
        end: Date;
        eventId?: string;
    } | null;
    /** Current drag mode */
    readonly dragMode: 'move' | 'create' | 'resize-start' | 'resize-end' | null;
    /** Check if a specific hour on a day is blocked */
    isBlocked(dayMs: number, hour: number): boolean;
    /** Check if a date is disabled */
    isDisabled(dayMs: number): boolean;
    /** Check if a timestamp is today */
    isToday(dayMs: number): boolean;
    /** Check if a timestamp is in the past */
    isPast(dayMs: number): boolean;
    /** Find an event by ID */
    eventById(id: string): TimelineEvent | undefined;
    /** Get header context (for building custom headers) */
    readonly headerContext: HeaderContext;
    /** Get navigation context (for building custom nav) */
    readonly navigationContext: NavigationContext;
    readonly store: EventStore;
    readonly viewState: ViewState;
    readonly selection: Selection;
    readonly dragState: DragState;
    readonly clock: Clock;
}
