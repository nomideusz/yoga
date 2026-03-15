import type { TimelineEvent } from '../../core/types.js';
interface Props {
    mondayStart?: boolean;
    locale?: string;
    height?: number;
    events?: TimelineEvent[];
    style?: string;
    focusDate?: Date;
    oneventclick?: (event: TimelineEvent) => void;
    selectedEventId?: string | null;
    [key: string]: unknown;
}
declare const AgendaWeek: import("svelte").Component<Props, {}, "">;
type AgendaWeek = ReturnType<typeof AgendaWeek>;
export default AgendaWeek;
