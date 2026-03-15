/**
 * In-memory adapter — the default for demos and testing.
 *
 * Events are stored in a plain array. No persistence across page loads.
 * Events without a `color` are auto-assigned one from a palette,
 * grouped by `category` or `title` so related events share a color.
 *
 * Usage:
 *   import { createMemoryAdapter } from './';
 *   const adapter = createMemoryAdapter(initialEvents);
 *   const adapter = createMemoryAdapter(initialEvents, { palette: myColors });
 */
import type { TimelineEvent } from '../core/types.js';
import type { CalendarAdapter } from './types.js';
export interface MemoryAdapterOptions {
    /**
     * Custom color palette for auto-coloring events.
     * Defaults to VIVID_PALETTE. Pass `generatePalette(accent)` to
     * make event colors adapt to your theme.
     */
    palette?: string[];
}
export declare function createMemoryAdapter(initial?: TimelineEvent[], options?: MemoryAdapterOptions): CalendarAdapter;
