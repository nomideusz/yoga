interface Props {
    /** Timestamp (ms) of the day to label */
    dayMs: number;
    /** Timestamp (ms) of today (for relative labels) */
    todayMs?: number;
    /** Display format */
    format?: 'relative' | 'short' | 'long';
    /** Whether this day is "today" */
    isToday?: boolean;
    /** Whether this day is in the past */
    isPast?: boolean;
}
declare const DayHeader: import("svelte").Component<Props, {}, "">;
type DayHeader = ReturnType<typeof DayHeader>;
export default DayHeader;
