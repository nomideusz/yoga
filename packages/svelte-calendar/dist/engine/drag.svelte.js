/**
 * Reactive drag state — tracks drag-to-create, drag-to-move, and resize operations.
 *
 * This is a state machine, not actual DOM event handling.
 * View components use Svelte `use:` actions (from actions/) to wire
 * pointer events → this state. The engine reads this state and commits
 * changes to the event store on drop.
 */
export function createDragState() {
    let mode = $state('none');
    let payload = $state(null);
    const active = $derived(mode !== 'none');
    function reset() {
        mode = 'none';
        payload = null;
    }
    return {
        get mode() {
            return mode;
        },
        get payload() {
            return payload;
        },
        get active() {
            return active;
        },
        beginCreate(start, end, dayIndex = 0) {
            mode = 'create';
            payload = { eventId: null, start, end, dayIndex };
        },
        beginMove(eventId, start, end) {
            mode = 'move';
            payload = { eventId, start, end, dayIndex: 0 };
        },
        beginResize(eventId, edge, start, end) {
            mode = edge === 'start' ? 'resize-start' : 'resize-end';
            payload = { eventId, start, end, dayIndex: 0 };
        },
        updatePointer(start, end, dayIndex) {
            if (!payload)
                return;
            payload = {
                ...payload,
                start,
                end,
                ...(dayIndex !== undefined ? { dayIndex } : {}),
            };
        },
        commit() {
            const result = payload;
            reset();
            return result;
        },
        cancel() {
            reset();
        },
    };
}
