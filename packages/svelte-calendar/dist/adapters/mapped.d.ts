/**
 * Mapped adapter — universal adapter factory for external schedule data.
 *
 * Takes any array of external records (yoga classes, gym schedules,
 * medical appointments, school timetables, etc.) and a mapping
 * configuration that describes how to extract `TimelineEvent` fields
 * from each record.
 *
 * Two usage modes:
 *   1. **Field mapping** — declarative config mapping field names:
 *        createMappedAdapter(rawEvents, {
 *          fields: { title: 'class_name', start: 'starts_at_iso', ... }
 *        });
 *
 *   2. **Custom mapper** — full control via a transform function:
 *        createMappedAdapter(rawEvents, {
 *          mapEvent: (raw, i) => ({ id: raw.ref, title: raw.name, ... })
 *        });
 *
 * The adapter is read-only by default (no create/update/delete).
 * Pass `readOnly: false` and supply mutation callbacks to enable writes.
 */
import type { TimelineEvent } from '../core/types.js';
import type { CalendarAdapter } from './types.js';
/**
 * Declarative field mapping from external record keys to TimelineEvent fields.
 *
 * Each value is a key name (string) of the source object whose value
 * will be used for the corresponding TimelineEvent field.
 *
 * For `start` and `end`, the source value can be:
 *   - an ISO 8601 string  ("2026-03-03T07:00:00+01:00")
 *   - a Date object
 *   - a Unix timestamp (number, ms)
 *   - a pair of date + time strings when using `startDate`+`startTime`
 */
export interface FieldMapping {
    /** Source key for `id`. Falls back to `reference_id`, `externalId`, or auto-generated. */
    id?: string;
    /** Source key for `title` (required unless `mapEvent` is used) */
    title?: string;
    /** Source key for a full start timestamp (ISO string, Date, or ms) */
    start?: string;
    /** Source key for a full end timestamp */
    end?: string;
    /**
     * Source key for a date-only string (e.g. "2026-03-03").
     * Combined with `startTime` / `endTime` when `start`/`end` are not available.
     */
    date?: string;
    /** Source key for start time string (e.g. "07:00") — combined with `date` */
    startTime?: string;
    /** Source key for end time string (e.g. "08:15") — combined with `date` */
    endTime?: string;
    /** Source key for `color` */
    color?: string;
    /** Source key for `subtitle` */
    subtitle?: string;
    /** Source key for `location` */
    location?: string;
    /** Source key for `category` */
    category?: string;
    /** Source key for `resourceId` */
    resourceId?: string;
    /** Source key for `externalId` */
    externalId?: string;
    /**
     * Source key for status. The source value is coerced:
     *   - boolean `true`/`false` on an `is_cancelled`-type field → 'cancelled'/'confirmed'
     *   - string 'cancelled'/'tentative'/'confirmed' used directly
     */
    status?: string;
    /**
     * Source keys that should be collected as tags.
     * Each key's value is included as a tag if truthy/non-empty.
     * String values are used directly; booleans use the key name.
     */
    tags?: string[];
}
export interface MappedAdapterOptions<T = Record<string, unknown>> {
    /**
     * Declarative field mapping — quick way to wire external fields
     * to TimelineEvent properties.
     */
    fields?: FieldMapping;
    /**
     * Custom mapper function — full control over the transformation.
     * When provided, `fields` is ignored.
     */
    mapEvent?: (raw: T, index: number) => TimelineEvent;
    /**
     * Fields to always include in `data` (the catch-all payload).
     * Pass `'*'` to include all unmapped source fields.
     * @default '*'
     */
    includeData?: string[] | '*';
    /**
     * When true (default), ignore source colors and auto-assign from
     * the palette grouped by category / title.  This keeps the calendar
     * visually consistent regardless of the upstream source.
     * Set to `false` to preserve the original colors from the data.
     * @default true
     */
    autoColor?: boolean;
    /**
     * Color palette used for auto-coloring.
     * Defaults to VIVID_PALETTE.
     */
    palette?: string[];
    /**
     * When true (default), create/update/delete throw an error.
     * Set to false and provide `onMutate` to enable writes.
     */
    readOnly?: boolean;
    /**
     * Optional mutation handler for write operations.
     * Only used when `readOnly` is false.
     */
    onMutate?: MutationHandler<T>;
}
export interface MutationHandler<T = Record<string, unknown>> {
    onCreate?: (event: Omit<TimelineEvent, 'id'>) => Promise<T>;
    onUpdate?: (id: string, patch: Partial<TimelineEvent>) => Promise<T>;
    onDelete?: (id: string) => Promise<void>;
}
/**
 * Create a CalendarAdapter from an array of external records + mapping config.
 *
 * @example
 * ```ts
 * // Yoga school schedule
 * const adapter = createMappedAdapter(yogaSchedule.events, {
 *   fields: {
 *     title: 'class_name',
 *     start: 'starts_at_iso',
 *     end: 'ends_at_iso',
 *     subtitle: 'teacher',
 *     location: 'room',
 *     color: 'color',
 *     externalId: 'reference_id',
 *     status: 'is_cancelled',
 *     tags: ['is_free', 'is_bookable_online'],
 *   },
 * });
 *
 * // Medical appointments
 * const adapter = createMappedAdapter(appointments, {
 *   fields: {
 *     title: 'procedure_name',
 *     start: 'scheduled_at',
 *     end: 'scheduled_end',
 *     subtitle: 'doctor_name',
 *     location: 'office',
 *     resourceId: 'doctor_id',
 *   },
 * });
 *
 * // Full custom mapper
 * const adapter = createMappedAdapter(rawData, {
 *   mapEvent: (raw) => ({
 *     id: raw.uid,
 *     title: `${raw.first_name} ${raw.last_name}`,
 *     start: new Date(raw.timestamp),
 *     end: new Date(raw.timestamp + raw.duration_ms),
 *     location: raw.room,
 *   }),
 * });
 * ```
 */
export declare function createMappedAdapter<T extends Record<string, unknown> = Record<string, unknown>>(sourceData: T[], options?: MappedAdapterOptions<T>): CalendarAdapter;
