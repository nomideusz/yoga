/**
 * createCalendar() — headless calendar state.
 *
 * Returns reactive state, computed layouts, and actions with zero DOM.
 * Users render their own UI using the returned data.
 *
 * Must be called during component initialisation (Svelte 5 rune scope).
 *
 * @example
 * ```svelte
 * <script>
 *   import { createCalendar, createMemoryAdapter } from '@nomideusz/svelte-calendar';
 *
 *   const adapter = createMemoryAdapter([
 *     { id: '1', title: 'Standup', start: new Date(), end: new Date() }
 *   ]);
 *
 *   const cal = createCalendar({ adapter });
 * </script>
 *
 * <!-- Render your own UI -->
 * <div>
 *   <button onclick={cal.prev}>←</button>
 *   <span>{cal.headerContext.dateLabel}</span>
 *   <button onclick={cal.next}>→</button>
 * </div>
 *
 * {#each cal.weeks as week}
 *   <div class="week-row">
 *     {#each week.days as day}
 *       <div class:today={day.isToday}>
 *         <span>{day.dayNum}</span>
 *         {#each day.events as event}
 *           <div style:background={event.color}>{event.title}</div>
 *         {/each}
 *       </div>
 *     {/each}
 *   </div>
 * {/each}
 * ```
 */
import { untrack } from 'svelte';
import { createEventStore } from '../engine/event-store.svelte.js';
import { createViewState } from '../engine/view-state.svelte.js';
import { createSelection } from '../engine/selection.svelte.js';
import { createDragState } from '../engine/drag.svelte.js';
import { createClock } from '../core/clock.svelte.js';
import { sod, DAY_MS, HOUR_MS, startOfWeek as sowFn, isAllDay, isMultiDay, segmentForDay, } from '../core/time.js';
import { monthLong, weekdayLong, weekdayShort } from '../core/locale.js';
export function createCalendar(options) {
    const { adapter, mondayStart: initialMondayStart = true, initialDate, locale, visibleHours, snapInterval = 15, equalDays = false, hideDays, blockedSlots, disabledDates, days: initialDayCount = 7, readOnly = false, minDuration, maxDuration, oneventclick, oneventcreate, oneventmove, } = options;
    // ── Create engine ────────────────────────────────────
    const store = createEventStore(adapter);
    const viewState = createViewState({
        view: options.view ?? 'week-planner',
        mondayStart: initialMondayStart,
        initialDate,
        dayCount: initialDayCount,
        modeForView: (id) => id.startsWith('day-') ? 'day' : 'week',
    });
    const selection = createSelection();
    const drag = createDragState();
    const clock = createClock();
    // ── Computed ──────────────────────────────────────────
    const disabledSet = $derived(new Set(disabledDates?.map((d) => sod(d.getTime())) ?? []));
    const startHour = visibleHours?.[0] ?? 0;
    const endHour = visibleHours?.[1] ?? 24;
    const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
    // ── Load events reactively ───────────────────────────
    $effect(() => {
        const { start, end } = viewState.range;
        store.load({ start, end });
    });
    // Eager initial load
    untrack(() => store.load({ start: viewState.range.start, end: viewState.range.end }));
    // ── Compute day cells ────────────────────────────────
    const days = $derived.by(() => {
        const { start, end } = viewState.range;
        const startMs = sod(start.getTime());
        const endMs = end.getTime();
        const events = store.events;
        const todayMs = clock.today;
        const result = [];
        for (let ms = startMs; ms < endMs; ms += DAY_MS) {
            const date = new Date(ms);
            const jsDay = date.getDay();
            const isoDay = jsDay === 0 ? 7 : jsDay;
            // Skip hidden days
            if (hideDays?.includes(isoDay))
                continue;
            const dayEnd = ms + DAY_MS;
            const dayEventsAll = events
                .filter((ev) => ev.start.getTime() < dayEnd && ev.end.getTime() > ms)
                .sort((a, b) => a.start.getTime() - b.start.getTime());
            const timedEvents = [];
            const allDaySegments = [];
            for (const ev of dayEventsAll) {
                if (isAllDay(ev) || isMultiDay(ev)) {
                    const seg = segmentForDay(ev, ms);
                    if (seg)
                        allDaySegments.push(seg);
                }
                else {
                    timedEvents.push(ev);
                }
            }
            result.push({
                ms,
                date,
                dayNum: date.getDate(),
                weekday: isoDay,
                isToday: ms === todayMs,
                isPast: equalDays ? false : ms < todayMs,
                isWeekend: jsDay === 0 || jsDay === 6,
                isDisabled: disabledSet.has(ms),
                isFirstOfMonth: date.getDate() === 1,
                events: timedEvents,
                allDaySegments,
            });
        }
        return result;
    });
    // ── Group days into weeks ────────────────────────────
    const weeks = $derived.by(() => {
        const dayCount = viewState.dayCount;
        const todayMs = clock.today;
        const result = [];
        for (let i = 0; i < days.length; i += dayCount) {
            const chunk = days.slice(i, i + dayCount);
            if (chunk.length === 0)
                continue;
            const periodStart = chunk[0].ms;
            const periodEnd = periodStart + dayCount * DAY_MS;
            result.push({
                periodStart,
                isCurrent: todayMs >= periodStart && todayMs < periodEnd,
                days: chunk,
            });
        }
        return result;
    });
    // ── Today queue ──────────────────────────────────────
    const todayQueue = $derived.by(() => {
        const todayMs = clock.today;
        const now = clock.tick;
        const todayDay = days.find((d) => d.ms === todayMs);
        if (!todayDay)
            return { past: [], current: [], upcoming: [] };
        const past = [];
        const current = [];
        const upcoming = [];
        for (const ev of todayDay.events) {
            const s = ev.start.getTime();
            const e = ev.end.getTime();
            if (e <= now)
                past.push(ev);
            else if (s <= now && e > now)
                current.push(ev);
            else
                upcoming.push(ev);
        }
        return { past, current, upcoming };
    });
    // ── Header context ───────────────────────────────────
    const headerContext = $derived.by(() => {
        const mode = viewState.mode;
        const focus = viewState.focusDate;
        const now = Date.now();
        const { start, end } = viewState.range;
        const isViewOnToday = now >= start.getTime() && now < end.getTime();
        let dateLabel;
        if (mode === 'day') {
            dateLabel = focus.toLocaleDateString(locale, {
                weekday: 'long', month: 'short', day: 'numeric',
            });
        }
        else {
            dateLabel = focus.toLocaleDateString(locale, {
                month: 'long', year: 'numeric',
            });
        }
        return {
            dateLabel,
            mode,
            modes: ['day', 'week'],
            switchMode: (m) => {
                const currentView = viewState.view;
                const currentLabel = currentView.replace(/^(day|week)-/, '');
                viewState.setView(`${m}-${currentLabel}`);
            },
            prev: () => viewState.prev(),
            next: () => viewState.next(),
            goToday: () => viewState.goToday(),
            isViewOnToday,
            focusDate: focus,
        };
    });
    const navigationContext = $derived.by(() => {
        const { start, end } = viewState.range;
        const now = Date.now();
        return {
            prev: () => viewState.prev(),
            next: () => viewState.next(),
            goToday: () => viewState.goToday(),
            isViewOnToday: now >= start.getTime() && now < end.getTime(),
            focusDate: viewState.focusDate,
            mode: viewState.mode,
        };
    });
    // ── Drag validation & commit ─────────────────────────
    async function commitDrag() {
        if (readOnly) {
            drag.cancel();
            return null;
        }
        const mode = drag.mode;
        const payload = drag.commit();
        if (!payload)
            return null;
        let { start, end } = payload;
        // Enforce min/max duration
        if (mode === 'create' || mode === 'resize-start' || mode === 'resize-end') {
            const durationMs = end.getTime() - start.getTime();
            const durationMin = durationMs / 60_000;
            if (minDuration && durationMin < minDuration) {
                if (mode === 'resize-start') {
                    start = new Date(end.getTime() - minDuration * 60_000);
                }
                else {
                    end = new Date(start.getTime() + minDuration * 60_000);
                }
            }
            if (maxDuration && durationMin > maxDuration) {
                if (mode === 'resize-start') {
                    start = new Date(end.getTime() - maxDuration * 60_000);
                }
                else {
                    end = new Date(start.getTime() + maxDuration * 60_000);
                }
            }
        }
        // Reject if lands on disabled date
        if (disabledDates?.length) {
            const startDay = sod(start.getTime());
            const endDay = sod(end.getTime() - 1);
            for (const dd of disabledDates) {
                const ts = sod(dd.getTime());
                if (ts >= startDay && ts <= endDay)
                    return null;
            }
        }
        // Reject if overlaps blocked slot
        if (blockedSlots?.length) {
            const startH = start.getHours() + start.getMinutes() / 60;
            const endH = end.getHours() + end.getMinutes() / 60 + (end.getDate() !== start.getDate() ? 24 : 0);
            const jsDay = start.getDay();
            const isoDay = jsDay === 0 ? 7 : jsDay;
            for (const slot of blockedSlots) {
                if (slot.day && slot.day !== isoDay)
                    continue;
                if (startH < slot.end && endH > slot.start)
                    return null;
            }
        }
        const result = {
            start,
            end,
            ...(payload.eventId ? { eventId: payload.eventId } : {}),
        };
        if ((mode === 'move' || mode === 'resize-start' || mode === 'resize-end') && payload.eventId) {
            try {
                await store.move(payload.eventId, start, end);
                const ev = store.byId(payload.eventId);
                if (ev)
                    oneventmove?.(ev, start, end);
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : '';
                if (!msg.includes('read-only') && !msg.includes('not found')) {
                    console.warn('[calendar] drag commit failed:', e);
                }
                return null;
            }
        }
        else if (mode === 'create') {
            oneventcreate?.({ start, end });
        }
        return result;
    }
    // ── Helpers ──────────────────────────────────────────
    function isBlocked(dayMs, hour) {
        if (!blockedSlots?.length)
            return false;
        const jsDay = new Date(dayMs).getDay();
        const isoDay = jsDay === 0 ? 7 : jsDay;
        return blockedSlots.some((slot) => {
            if (slot.day && slot.day !== isoDay)
                return false;
            return hour >= slot.start && hour < slot.end;
        });
    }
    function isDisabledFn(dayMs) {
        return disabledSet.has(sod(dayMs));
    }
    function isTodayFn(dayMs) {
        return sod(dayMs) === clock.today;
    }
    function isPastFn(dayMs) {
        if (equalDays)
            return false;
        return sod(dayMs) < clock.today;
    }
    // ── Return headless calendar ─────────────────────────
    return {
        // Reactive state
        get events() { return store.events; },
        get loading() { return store.loading; },
        get focusDate() { return viewState.focusDate; },
        get mode() { return viewState.mode; },
        get view() { return viewState.view; },
        get range() { return viewState.range; },
        get today() { return clock.today; },
        get now() { return clock.tick; },
        get timeLabel() { return clock.hm; },
        get secondsLabel() { return clock.s; },
        get selectedEventId() { return selection.selectedId; },
        // Computed layouts
        get days() { return days; },
        get weeks() { return weeks; },
        get hours() { return hours; },
        get todayQueue() { return todayQueue; },
        // Configuration
        get mondayStart() { return viewState.mondayStart; },
        get locale() { return locale; },
        get readOnly() { return readOnly; },
        get dayCount() { return viewState.dayCount; },
        // Navigation
        prev: () => viewState.prev(),
        next: () => viewState.next(),
        goToday: () => viewState.goToday(),
        setView: (id) => viewState.setView(id),
        setFocusDate: (d) => viewState.setFocusDate(d),
        setMondayStart: (v) => viewState.setMondayStart(v),
        setDayCount: (n) => viewState.setDayCount(n),
        // Selection
        selectEvent: (id) => id ? selection.select(id) : selection.deselect(),
        clearSelection: () => selection.clear(),
        // Drag
        beginDragMove: (eventId, start, end) => drag.beginMove(eventId, start, end),
        beginDragCreate: (start, end) => drag.beginCreate(start, end),
        updateDrag: (start, end) => drag.updatePointer(start, end),
        commitDrag,
        cancelDrag: () => drag.cancel(),
        get isDragging() { return drag.active; },
        get dragPayload() {
            if (!drag.payload)
                return null;
            return {
                start: drag.payload.start,
                end: drag.payload.end,
                ...(drag.payload.eventId ? { eventId: drag.payload.eventId } : {}),
            };
        },
        get dragMode() { return drag.mode === 'none' ? null : drag.mode; },
        // Helpers
        isBlocked,
        isDisabled: isDisabledFn,
        isToday: isTodayFn,
        isPast: isPastFn,
        eventById: (id) => store.byId(id),
        get headerContext() { return headerContext; },
        get navigationContext() { return navigationContext; },
        // Raw engine access
        get store() { return store; },
        get viewState() { return viewState; },
        get selection() { return selection; },
        get dragState() { return drag; },
        get clock() { return clock; },
    };
}
