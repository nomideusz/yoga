import type { CalendarAdapter } from './types.js';
export interface CompositeAdapterOptions {
    /**
     * Index of the adapter that handles mutations (create/update/delete).
     * Defaults to `0` (the first adapter).
     */
    primaryIndex?: number;
}
/**
 * Create a CalendarAdapter that merges events from multiple child adapters.
 *
 * @param adapters  Array of child adapters to merge.
 * @param options   Optional configuration.
 */
export declare function createCompositeAdapter(adapters: CalendarAdapter[], options?: CompositeAdapterOptions): CalendarAdapter;
