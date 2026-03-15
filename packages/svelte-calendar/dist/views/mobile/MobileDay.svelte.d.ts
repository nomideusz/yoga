import type { TimelineEvent } from '../../core/types.js';
interface Props {
    height?: number | null;
    events?: TimelineEvent[];
    style?: string;
    focusDate?: Date;
    locale?: string;
    oneventclick?: (event: TimelineEvent) => void;
    oneventcreate?: (range: {
        start: Date;
        end: Date;
    }) => void;
    selectedEventId?: string | null;
    readOnly?: boolean;
    visibleHours?: [number, number];
    [key: string]: unknown;
}
declare const MobileDay: import("svelte").Component<Props, {}, "">;
type MobileDay = ReturnType<typeof MobileDay>;
export default MobileDay;
