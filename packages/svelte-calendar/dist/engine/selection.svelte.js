/**
 * Reactive selection state — tracks selected and hovered events.
 *
 * Usage:
 *   const sel = createSelection();
 *   sel.selectedId   — currently selected event ID (or null)
 *   sel.hoveredId    — currently hovered event ID (or null)
 *   sel.selectedIds  — Set of selected IDs (multi-select)
 *   sel.select(id)   — select one event (clears multi)
 *   sel.toggle(id)   — toggle in multi-select
 *   sel.clear()      — deselect all
 */
export function createSelection() {
    let selectedId = $state(null);
    let hoveredId = $state(null);
    let selectedIds = $state(new Set());
    return {
        get selectedId() {
            return selectedId;
        },
        get hoveredId() {
            return hoveredId;
        },
        get selectedIds() {
            return selectedIds;
        },
        select(id) {
            selectedId = id;
            selectedIds = new Set([id]);
        },
        deselect() {
            selectedId = null;
            selectedIds = new Set();
        },
        toggle(id) {
            const next = new Set(selectedIds);
            if (next.has(id)) {
                next.delete(id);
            }
            else {
                next.add(id);
            }
            selectedIds = next;
            selectedId = next.size === 1 ? [...next][0] : null;
        },
        clear() {
            selectedId = null;
            hoveredId = null;
            selectedIds = new Set();
        },
        hover(id) {
            hoveredId = id;
        },
        isSelected(id) {
            return selectedIds.has(id);
        },
    };
}
