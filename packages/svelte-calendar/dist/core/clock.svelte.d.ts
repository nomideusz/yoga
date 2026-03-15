export interface Clock {
    /** Current epoch ms, updated every second */
    readonly tick: number;
    /** Start-of-day epoch ms for today */
    readonly today: number;
    /** Formatted hours:minutes — "14:30" */
    readonly hm: string;
    /** Formatted seconds — ":05" */
    readonly s: string;
    /** Fractional hours since midnight — 14.5 */
    readonly fractionalHour: number;
    /** Stop the clock (called automatically on component unmount) */
    destroy: () => void;
}
/**
 * Create a shared reactive clock.
 *
 * Must be called during component initialisation (before first await).
 * Automatically cleans up on unmount via onMount return.
 */
export declare function createClock(): Clock;
