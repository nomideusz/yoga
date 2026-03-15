import type { Snippet } from 'svelte';
interface Props {
    /** Visual mode */
    mode?: 'line' | 'dot' | 'badge';
    /** Pixel offset for positioning (line/dot modes) */
    position?: number;
    /** Orientation of the line/dot */
    orientation?: 'vertical' | 'horizontal';
    /** Formatted time string (e.g. "14:30") */
    time?: string;
    /** Formatted seconds string (e.g. ":05") */
    seconds?: string;
    /** Show the time label */
    showLabel?: boolean;
    /** Accent color override */
    color?: string;
    /** Custom content slot */
    children?: Snippet;
}
declare const NowIndicator: import("svelte").Component<Props, {}, "">;
type NowIndicator = ReturnType<typeof NowIndicator>;
export default NowIndicator;
