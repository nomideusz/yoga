interface Props {
    orientation?: 'horizontal' | 'vertical';
    /** Pixel size per hour (width for horizontal, height for vertical) */
    hourSize?: number;
    /** Show half-hour ticks (horizontal only) */
    halfHour?: boolean;
    /** Hours to display (default 0-23) */
    hours?: readonly number[];
    /** Custom hour formatter */
    formatHour?: (h: number) => string;
}
declare const TimeGutter: import("svelte").Component<Props, {}, "">;
type TimeGutter = ReturnType<typeof TimeGutter>;
export default TimeGutter;
