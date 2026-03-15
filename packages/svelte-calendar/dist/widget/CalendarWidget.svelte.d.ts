interface Props {
    /** REST API base URL — if provided, fetches events from this endpoint */
    api?: string;
    /** JSON string of events for static/inline data (alternative to api) */
    events?: string;
    /** Theme preset name: midnight, neutral */
    theme?: string;
    /** Default view ID */
    view?: string;
    /** Calendar height in pixels */
    height?: string;
    /** BCP 47 locale tag (e.g. 'en-US', 'pl-PL') */
    locale?: string;
    /** Text direction: ltr, rtl, auto */
    dir?: string;
    /** Start week on Monday (default: true) */
    mondaystart?: string;
    /** Custom HTTP headers as JSON string for REST adapter */
    headers?: string;
}
declare const CalendarWidget: import("svelte").Component<Props, {}, "">;
type CalendarWidget = ReturnType<typeof CalendarWidget>;
export default CalendarWidget;
