import type { DateRange } from '../adapters/types.js';
export type { DateRange };
/**
 * Built-in view IDs. Custom view IDs are also supported — CalendarViewId
 * is typed as `string` so consumers can register any ID.
 */
export type BuiltInViewId = 'day-planner' | 'day-agenda' | 'week-planner' | 'week-agenda';
/**
 * Any view identifier. Use built-in strings like 'day-planner' or your own
 * custom IDs like 'day-kanban', 'week-resource', etc.
 */
export type CalendarViewId = string;
export type ViewMode = 'day' | 'week';
export interface ViewStateOptions {
    view?: CalendarViewId;
    mondayStart?: boolean;
    /** IANA timezone string (e.g. 'America/New_York'). Defaults to local timezone. */
    timezone?: string;
    /** Initial date to focus on (defaults to today). */
    initialDate?: Date;
    /** Number of days shown in week mode (default: 7). E.g. 3 for a 3-day view, 5 for workweek. */
    dayCount?: number;
    /**
     * Optional resolver for view mode.
     * Useful for custom IDs that don't follow "day-*" / "week-*" naming.
     */
    modeForView?: (viewId: CalendarViewId) => ViewMode | undefined;
}
export interface ViewState {
    readonly view: CalendarViewId;
    readonly focusDate: Date;
    readonly range: DateRange;
    readonly mode: ViewMode;
    readonly mondayStart: boolean;
    /** IANA timezone, or undefined for local */
    readonly timezone: string | undefined;
    /** Number of days shown in week mode */
    readonly dayCount: number;
    setView(id: CalendarViewId): void;
    setMondayStart(value: boolean): void;
    setFocusDate(date: Date): void;
    setDayCount(n: number): void;
    next(): void;
    prev(): void;
    goToday(): void;
}
export declare function createViewState(options?: ViewStateOptions): ViewState;
