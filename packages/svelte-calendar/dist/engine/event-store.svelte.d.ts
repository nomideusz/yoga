import type { TimelineEvent } from '../core/types.js';
import type { CalendarAdapter, DateRange } from '../adapters/types.js';
export interface EventStore {
    /** All currently loaded events (reactive) */
    readonly events: TimelineEvent[];
    /** Whether a load/mutation is in-flight */
    readonly loading: boolean;
    /** Last error, if any */
    readonly error: string | null;
    /** Load events from the adapter for a date range */
    load(range: DateRange): Promise<void>;
    /** Get events overlapping a date range (client-side filter) */
    forRange(start: Date, end: Date): TimelineEvent[];
    /** Get events for a single day */
    forDay(date: Date): TimelineEvent[];
    /** Get a single event by ID */
    byId(id: string): TimelineEvent | undefined;
    /** Create a new event */
    add(event: Omit<TimelineEvent, 'id'>): Promise<TimelineEvent>;
    /** Patch an existing event */
    update(id: string, patch: Partial<TimelineEvent>): Promise<void>;
    /** Delete an event */
    remove(id: string): Promise<void>;
    /** Move an event to a new time range (drag shorthand) */
    move(id: string, newStart: Date, newEnd: Date): Promise<void>;
}
/**
 * Create a reactive event store backed by a CalendarAdapter.
 */
export declare function createEventStore(adapter: CalendarAdapter): EventStore;
