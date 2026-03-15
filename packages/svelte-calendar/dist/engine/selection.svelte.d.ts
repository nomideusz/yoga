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
export interface Selection {
    readonly selectedId: string | null;
    readonly hoveredId: string | null;
    readonly selectedIds: ReadonlySet<string>;
    select(id: string): void;
    deselect(): void;
    toggle(id: string): void;
    clear(): void;
    hover(id: string | null): void;
    isSelected(id: string): boolean;
}
export declare function createSelection(): Selection;
