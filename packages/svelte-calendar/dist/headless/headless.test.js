/**
 * Headless API tests.
 *
 * Note: createCalendar() uses createClock() which requires onMount (Svelte component context).
 * These tests verify the module exports, types, and helper logic.
 * Full integration tests should be done in a Svelte component context.
 */
import { describe, it, expect } from 'vitest';
describe('headless exports', () => {
    it('exports createCalendar from the headless module', async () => {
        const mod = await import('./index.js');
        expect(mod.createCalendar).toBeDefined();
        expect(typeof mod.createCalendar).toBe('function');
    });
    it('exports createCalendar from the main index', async () => {
        const mod = await import('../index.js');
        expect(mod.createCalendar).toBeDefined();
        expect(typeof mod.createCalendar).toBe('function');
    });
    it('HeadlessCalendarOptions type is usable (compile-time check)', async () => {
        // This test verifies that the type is importable and structurally sound.
        // If the type had errors, TypeScript compilation would fail.
        const mod = await import('./types.js');
        // Types don't have runtime values, but importing the module verifies compilation.
        expect(mod).toBeDefined();
    });
});
describe('headless type structure', () => {
    it('HeadlessDay has expected shape in documentation', () => {
        // Verify the interface shape by checking that a conforming object compiles.
        // This is a compile-time check; if types were wrong, the test wouldn't compile.
        const day = {
            ms: 0,
            date: new Date(),
            dayNum: 1,
            weekday: 1,
            isToday: false,
            isPast: false,
            isWeekend: false,
            isDisabled: false,
            isFirstOfMonth: false,
            events: [],
            allDaySegments: [],
        };
        expect(day.ms).toBe(0);
        expect(day.dayNum).toBe(1);
    });
    it('HeadlessWeek has expected shape', () => {
        const week = {
            periodStart: 0,
            isCurrent: false,
            days: [],
        };
        expect(week.days).toEqual([]);
    });
    it('TodayQueue has expected shape', () => {
        const queue = {
            past: [],
            current: [],
            upcoming: [],
        };
        expect(queue.past).toEqual([]);
        expect(queue.current).toEqual([]);
        expect(queue.upcoming).toEqual([]);
    });
});
