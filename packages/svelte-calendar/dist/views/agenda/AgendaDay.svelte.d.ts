import type { TimelineEvent } from '../../core/types.js';
interface Props {
    locale?: string;
    height?: number;
    events?: TimelineEvent[];
    style?: string;
    focusDate?: Date;
    oneventclick?: (event: TimelineEvent) => void;
    selectedEventId?: string | null;
    [key: string]: unknown;
}
declare const AgendaDay: import("svelte").Component<Props, {}, "">;
type AgendaDay = ReturnType<typeof AgendaDay>;
export default AgendaDay;
