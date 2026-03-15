import type { TimelineEvent } from '../core/types.js';
import type { Snippet } from 'svelte';
interface Props {
    event: TimelineEvent;
    /** Display variant */
    variant?: 'chip' | 'card' | 'row';
    /** Is this event currently in-progress? */
    active?: boolean;
    /** Is this event in the past? */
    past?: boolean;
    /** Show the time range */
    showTime?: boolean;
    /** Show the duration */
    showDuration?: boolean;
    /** Editable (shows resize handles in future) */
    editable?: boolean;
    /** Click handler */
    onclick?: (event: TimelineEvent) => void;
    /** Custom content slot */
    children?: Snippet<[TimelineEvent]>;
}
declare const EventBlock: import("svelte").Component<Props, {}, "">;
type EventBlock = ReturnType<typeof EventBlock>;
export default EventBlock;
