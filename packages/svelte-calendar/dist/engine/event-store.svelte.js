/**
 * Reactive event store — the CRUD brain of the calendar.
 *
 * Wraps a CalendarAdapter and exposes Svelte 5 rune-mode reactive state.
 * All mutations go through the adapter first, then update local state.
 *
 * Usage:
 *   const store = createEventStore(adapter);
 *   // store.events       — all loaded events (reactive)
 *   // store.forRange()   — query by date range
 *   // store.forDay()     — query single day
 *   // store.add()        — create event
 *   // store.update()     — patch event
 *   // store.remove()     — delete event
 *   // store.move()       — drag-move shorthand
 *   // store.load()       — fetch from adapter for a range
 */
import { SvelteMap } from 'svelte/reactivity';
import { sod, DAY_MS } from '../core/time.js';
/**
 * Create a reactive event store backed by a CalendarAdapter.
 */
export function createEventStore(adapter) {
    let eventMap = new SvelteMap();
    let loading = $state(false);
    let error = $state(null);
    // Derived array view of the map — consumers read this.
    const eventArray = $derived([...eventMap.values()]);
    // ── Internal helpers ──
    function overlaps(ev, start, end) {
        return ev.start < end && ev.end > start;
    }
    function removeEvent(id) {
        eventMap.delete(id);
    }
    function upsertEvent(ev) {
        eventMap.set(ev.id, ev);
    }
    // ── Public API ──
    return {
        get events() {
            return eventArray;
        },
        get loading() {
            return loading;
        },
        get error() {
            return error;
        },
        async load(range) {
            loading = true;
            error = null;
            try {
                const fetched = await adapter.fetchEvents(range);
                // Merge: upsert fetched, don't blow away events outside this range
                for (const ev of fetched) {
                    upsertEvent(ev);
                }
            }
            catch (e) {
                error = e instanceof Error ? e.message : String(e);
            }
            finally {
                loading = false;
            }
        },
        forRange(start, end) {
            return eventArray.filter((ev) => overlaps(ev, start, end));
        },
        forDay(date) {
            const dayStart = new Date(sod(date.getTime()));
            const dayEnd = new Date(dayStart.getTime() + DAY_MS);
            return eventArray.filter((ev) => overlaps(ev, dayStart, dayEnd));
        },
        byId(id) {
            return eventMap.get(id);
        },
        async add(eventData) {
            loading = true;
            error = null;
            try {
                const created = await adapter.createEvent(eventData);
                upsertEvent(created);
                return created;
            }
            catch (e) {
                error = e instanceof Error ? e.message : String(e);
                throw e;
            }
            finally {
                loading = false;
            }
        },
        async update(id, patch) {
            loading = true;
            error = null;
            try {
                const updated = await adapter.updateEvent(id, patch);
                upsertEvent(updated);
            }
            catch (e) {
                error = e instanceof Error ? e.message : String(e);
                throw e;
            }
            finally {
                loading = false;
            }
        },
        async remove(id) {
            loading = true;
            error = null;
            try {
                await adapter.deleteEvent(id);
                removeEvent(id);
            }
            catch (e) {
                error = e instanceof Error ? e.message : String(e);
                throw e;
            }
            finally {
                loading = false;
            }
        },
        async move(id, newStart, newEnd) {
            return this.update(id, { start: newStart, end: newEnd });
        },
    };
}
