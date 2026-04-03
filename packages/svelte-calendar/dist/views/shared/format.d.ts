/**
 * Shared format helpers for agenda views.
 * Extracted from duplicated code in AgendaDay and AgendaWeek.
 */
import type { TimelineEvent } from '../../core/types.js';
export declare function fmtTime(d: Date, locale?: string): string;
export declare function duration(ev: TimelineEvent): string;
export declare function timeUntilMs(ms: number, now: number): string;
export declare function progress(ev: TimelineEvent, now: number): number;
/**
 * Group overlapping events into time slots.
 * Used by both AgendaDay and AgendaWeek.
 */
export interface TimeSlot {
    startMs: number;
    endMs: number;
    events: TimelineEvent[];
}
export declare function groupIntoSlots(evts: TimelineEvent[]): TimeSlot[];
