import type { TimelineEvent } from '../../core/types.js';
interface Props {
    /** Total height (null = fill parent) */
    height?: number | null;
    /** Events to render */
    events?: TimelineEvent[];
    /** Inline style for CSS variable overrides (theme) */
    style?: string;
    /** The date to centre this view on */
    focusDate?: Date;
    /** Locale for labels */
    locale?: string;
    /** Called when the user clicks an event */
    oneventclick?: (event: TimelineEvent) => void;
    /** Called when the user clicks an empty time slot */
    oneventcreate?: (range: {
        start: Date;
        end: Date;
    }) => void;
    /** Currently selected event ID (for highlight) */
    selectedEventId?: string | null;
    /** Read-only mode */
    readOnly?: boolean;
    /** Visible hour range [startHour, endHour) */
    visibleHours?: [number, number];
    [key: string]: unknown;
}
declare const PlannerDay: import("svelte").Component<Props, {}, "">;
type PlannerDay = ReturnType<typeof PlannerDay>;
export default PlannerDay;
