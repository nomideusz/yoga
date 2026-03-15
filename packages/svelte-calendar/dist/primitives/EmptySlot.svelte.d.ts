interface Props {
    /** Start time of the empty slot */
    start: Date;
    /** End time of the empty slot */
    end: Date;
    /** Click handler — create event in this range */
    onclick?: (range: {
        start: Date;
        end: Date;
    }) => void;
    /** Orientation for cursor hint */
    orientation?: 'horizontal' | 'vertical';
}
declare const EmptySlot: import("svelte").Component<Props, {}, "">;
type EmptySlot = ReturnType<typeof EmptySlot>;
export default EmptySlot;
