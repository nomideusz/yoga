/**
 * Create a CalendarAdapter that merges events from multiple child adapters.
 *
 * @param adapters  Array of child adapters to merge.
 * @param options   Optional configuration.
 */
export function createCompositeAdapter(adapters, options = {}) {
    if (adapters.length === 0) {
        throw new Error('createCompositeAdapter requires at least one adapter');
    }
    const { primaryIndex = 0 } = options;
    if (primaryIndex < 0 || primaryIndex >= adapters.length) {
        throw new Error(`primaryIndex ${primaryIndex} is out of range [0, ${adapters.length - 1}]`);
    }
    const primary = adapters[primaryIndex];
    return {
        async fetchEvents(range) {
            const results = await Promise.all(adapters.map((a) => a.fetchEvents(range)));
            // Flatten and deduplicate by id (first occurrence wins)
            const seen = new Set();
            const merged = [];
            for (const batch of results) {
                for (const ev of batch) {
                    if (!seen.has(ev.id)) {
                        seen.add(ev.id);
                        merged.push(ev);
                    }
                }
            }
            return merged;
        },
        createEvent(event) {
            return primary.createEvent(event);
        },
        updateEvent(id, patch) {
            return primary.updateEvent(id, patch);
        },
        deleteEvent(id) {
            return primary.deleteEvent(id);
        },
    };
}
