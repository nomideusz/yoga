import { describe, it, expect } from 'vitest';
import { createTextMeasure } from './measure.js';
describe('createTextMeasure', () => {
    describe('heuristic fallback (no Pretext)', () => {
        const m = createTextMeasure({
            titleFont: '500 12px system-ui',
            secondaryFont: '400 10px system-ui',
            titleLineHeight: 16,
            secondaryLineHeight: 13,
        });
        it('reports available=false without Pretext', () => {
            expect(m.available).toBe(false);
        });
        it('measures short text as single line', () => {
            const result = m.measure('Hello', 200, 16);
            expect(result.lineCount).toBe(1);
            expect(result.height).toBe(16);
        });
        it('measures long text as multiple lines', () => {
            const longText = 'This is a very long event title that should definitely wrap to multiple lines in a narrow container';
            const result = m.measure(longText, 80, 16);
            expect(result.lineCount).toBeGreaterThan(1);
            expect(result.height).toBeGreaterThan(16);
        });
        it('fits() returns true for short text', () => {
            expect(m.fits('Hi', 200, 16)).toBe(true);
        });
        it('fits() returns false for long text in narrow width', () => {
            const long = 'Very long event title that cannot fit in 30 pixels';
            expect(m.fits(long, 30, 16)).toBe(false);
        });
        it('measures empty text as zero height', () => {
            const result = m.measure('', 200, 16);
            expect(result.height).toBe(0);
            expect(result.lineCount).toBe(0);
        });
    });
    describe('measureStack', () => {
        const m = createTextMeasure({
            titleFont: '500 14px system-ui',
            secondaryFont: '400 10px system-ui',
            titleLineHeight: 18,
            secondaryLineHeight: 13,
            contentGap: 4,
        });
        it('measures multiple text items with gaps', () => {
            const result = m.measureStack([
                { text: 'Title', font: '500 14px system-ui', lineHeight: 18 },
                { text: 'Subtitle', font: '400 10px system-ui', lineHeight: 13 },
            ], 200);
            expect(result.breakdown).toHaveLength(2);
            expect(result.height).toBeGreaterThan(0);
            // Should be title height + gap + subtitle height
            expect(result.height).toBe(18 + 4 + 13);
        });
        it('skips empty text items', () => {
            const result = m.measureStack([
                { text: 'Title', lineHeight: 18 },
                { text: '', lineHeight: 13 },
            ], 200);
            expect(result.height).toBe(18); // only title, no gap for empty
        });
    });
    describe('fitContent', () => {
        const m = createTextMeasure({
            titleFont: '500 12px system-ui',
            secondaryFont: '400 10px system-ui',
            tagFont: '500 8px system-ui',
            titleLineHeight: 16,
            secondaryLineHeight: 13,
            contentGap: 3,
        });
        it('always shows title', () => {
            const fit = m.fitContent({
                title: 'Meeting',
                maxWidth: 200,
                maxHeight: 20,
            });
            expect(fit.title).toBe(true);
            expect(fit.titleLines).toBeGreaterThanOrEqual(1);
        });
        it('shows all fields when space is generous', () => {
            const fit = m.fitContent({
                title: 'Meeting',
                subtitle: 'Room 42',
                location: 'Building A',
                time: '9:00 – 10:00',
                tags: ['work', 'urgent'],
                maxWidth: 200,
                maxHeight: 200,
            });
            expect(fit.title).toBe(true);
            expect(fit.subtitle).toBe(true);
            expect(fit.location).toBe(true);
            expect(fit.time).toBe(true);
            expect(fit.tags).toBe(true);
        });
        it('hides optional fields when space is tight', () => {
            const fit = m.fitContent({
                title: 'Meeting',
                subtitle: 'With a very long description',
                location: 'Building A',
                time: '9:00 – 10:00',
                tags: ['work'],
                maxWidth: 100,
                maxHeight: 30, // only enough for title + maybe one more
            });
            expect(fit.title).toBe(true);
            // At least some optional fields should be hidden
            const optionalShown = [fit.subtitle, fit.location, fit.time, fit.tags].filter(Boolean).length;
            expect(optionalShown).toBeLessThan(4);
        });
        it('totalHeight reflects what is shown', () => {
            const fit = m.fitContent({
                title: 'Meeting',
                maxWidth: 200,
                maxHeight: 200,
            });
            expect(fit.totalHeight).toBe(16); // just title
        });
    });
    describe('clear', () => {
        it('does not throw', () => {
            const m = createTextMeasure();
            expect(() => m.clear()).not.toThrow();
        });
    });
});
