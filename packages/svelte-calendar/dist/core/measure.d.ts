/**
 * Text measurement utilities powered by Pretext.
 *
 * Provides DOM-free text measurement for calendar event blocks.
 * Pretext is an optional peer dependency — if not installed,
 * these functions degrade gracefully to simple heuristics.
 *
 * Usage:
 *   const m = createTextMeasure({ font: '500 12px Inter' });
 *   const fits = m.fits('Meeting with team', 120, 16); // width, lineHeight
 *   const { height, lineCount } = m.measure('Long event title...', 120, 16);
 *   m.clear(); // release caches
 */
export interface TextMeasure {
    /**
     * Measure text height at a given width.
     * Returns { height, lineCount }.
     */
    measure(text: string, maxWidth: number, lineHeight: number): {
        height: number;
        lineCount: number;
    };
    /**
     * Check if text fits in a single line at the given width.
     */
    fits(text: string, maxWidth: number, lineHeight: number): boolean;
    /**
     * Measure multiple texts and return their combined height.
     * Useful for checking if title + subtitle + tags fit in a block.
     */
    measureStack(items: Array<{
        text: string;
        font?: string;
        lineHeight?: number;
    }>, maxWidth: number, gap?: number): {
        height: number;
        breakdown: Array<{
            height: number;
            lineCount: number;
        }>;
    };
    /**
     * Given available height and width, decide which content layers fit.
     * Returns a visibility map for common event fields.
     */
    fitContent(opts: {
        title: string;
        subtitle?: string;
        location?: string;
        time?: string;
        tags?: string[];
        maxWidth: number;
        maxHeight: number;
    }): ContentFit;
    /** Release internal caches. */
    clear(): void;
    /** Whether Pretext is available (true) or using heuristic fallback (false). */
    readonly available: boolean;
}
export interface ContentFit {
    /** Title always shown */
    title: true;
    /** Number of lines the title takes */
    titleLines: number;
    /** Whether subtitle fits */
    subtitle: boolean;
    /** Whether location fits */
    location: boolean;
    /** Whether time range fits */
    time: boolean;
    /** Whether tags fit */
    tags: boolean;
    /** Total height of all visible content */
    totalHeight: number;
}
export interface TextMeasureOptions {
    /** CSS font shorthand for titles (e.g. '500 12px Inter') */
    titleFont?: string;
    /** CSS font shorthand for secondary text (subtitle, location, time) */
    secondaryFont?: string;
    /** CSS font shorthand for tags */
    tagFont?: string;
    /** Default line height for titles */
    titleLineHeight?: number;
    /** Default line height for secondary text */
    secondaryLineHeight?: number;
    /** Gap between content rows in px */
    contentGap?: number;
}
/**
 * Create a text measure instance.
 * Lazily loads Pretext on first use. Falls back to char-width heuristics if unavailable.
 */
export declare function createTextMeasure(opts?: TextMeasureOptions): TextMeasure;
/**
 * Initialize Pretext for text measurement.
 * Call this once in your app's entry point (e.g., +layout.svelte onMount).
 * If not called, measurement falls back to character-width heuristics.
 *
 * Usage:
 *   import { initTextMeasure } from '@nomideusz/svelte-calendar';
 *   onMount(() => initTextMeasure());
 */
export declare function initTextMeasure(): Promise<boolean>;
