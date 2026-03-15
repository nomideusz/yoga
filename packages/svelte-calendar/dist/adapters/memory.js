import { VIVID_PALETTE } from '../core/palette.js';
let counter = 0;
function uid() {
    return `mem-${Date.now()}-${++counter}`;
}
export function createMemoryAdapter(initial = [], options) {
    const events = [...initial];
    const palette = options?.palette ?? VIVID_PALETTE;
    // Auto-color: assign from vivid palette by category/title
    const colorAssignments = new Map();
    let colorIndex = 0;
    function resolveColor(ev) {
        if (ev.color)
            return ev.color;
        const key = ev.category ?? ev.title;
        if (!colorAssignments.has(key)) {
            colorAssignments.set(key, palette[colorIndex % palette.length]);
            colorIndex++;
        }
        return colorAssignments.get(key);
    }
    function withColor(ev) {
        const color = resolveColor(ev);
        return color ? { ...ev, color } : ev;
    }
    function overlaps(ev, range) {
        return ev.start < range.end && ev.end > range.start;
    }
    return {
        async fetchEvents(range) {
            return events.filter((ev) => overlaps(ev, range)).map(withColor);
        },
        async createEvent(data) {
            const ev = { ...data, id: uid() };
            events.push(ev);
            return withColor(ev);
        },
        async updateEvent(id, patch) {
            const idx = events.findIndex((e) => e.id === id);
            if (idx < 0)
                throw new Error(`Event not found: ${id}`);
            events[idx] = { ...events[idx], ...patch, id };
            return withColor(events[idx]);
        },
        async deleteEvent(id) {
            const idx = events.findIndex((e) => e.id === id);
            if (idx < 0)
                throw new Error(`Event not found: ${id}`);
            events.splice(idx, 1);
        },
    };
}
