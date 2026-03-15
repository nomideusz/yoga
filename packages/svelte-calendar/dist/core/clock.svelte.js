/**
 * Reactive clock state factory for Svelte 5 rune-mode.
 *
 * Usage inside a component:
 *   const clock = createClock();
 *   // clock.tick   — current timestamp, updates every second
 *   // clock.today  — start-of-day timestamp, rolls over at midnight
 *   // clock.hm     — "14:30"
 *   // clock.s      — ":05"
 *   // clock.fractionalHour — 14.5
 *
 * Call clock.destroy() in onMount's cleanup (or it auto-cleans via $effect).
 */
import { onMount } from 'svelte';
import { sod, fmtHM, fmtS, fractionalHour } from './time.js';
/**
 * Create a shared reactive clock.
 *
 * Must be called during component initialisation (before first await).
 * Automatically cleans up on unmount via onMount return.
 */
export function createClock() {
    let tick = $state(Date.now());
    let today = $state(sod(Date.now()));
    let intervalId = null;
    function start() {
        intervalId = setInterval(() => {
            tick = Date.now();
            const sd = sod(tick);
            if (sd !== today)
                today = sd;
        }, 1000);
    }
    function destroy() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
    // Auto-start and auto-cleanup
    onMount(() => {
        start();
        return destroy;
    });
    return {
        get tick() { return tick; },
        get today() { return today; },
        get hm() { return fmtHM(tick); },
        get s() { return fmtS(tick); },
        get fractionalHour() { return fractionalHour(tick); },
        destroy,
    };
}
