/**
 * Smart Auto Theme — probes the host page and generates --dt-* CSS tokens
 * that blend the calendar into any design system.
 *
 * How it works:
 *   1. Reads computed styles from the element's ancestors (body, parent)
 *   2. Detects light/dark mode from background luminance
 *   3. Extracts fonts, text colors, accent/brand colors
 *   4. Generates a full --dt-* CSS variable string
 *
 * Usage:
 *   const vars = probeHostTheme(calendarElement);
 *   // → "--dt-bg: #fff; --dt-text: rgba(0,0,0,0.87); ..."
 *
 * The Calendar component calls this automatically when theme is `auto` (empty string).
 */
/** Options for fine-tuning auto-detection behavior. */
export interface AutoThemeOptions {
    /**
     * Force light or dark mode instead of auto-detecting.
     * Useful when the host page has a known color scheme.
     */
    mode?: 'light' | 'dark' | 'auto';
    /**
     * Override the accent color (hex). Skips accent probing.
     * Example: '#2563eb'
     */
    accent?: string;
    /**
     * Override the font stack. Skips font probing.
     * Example: '"Inter", system-ui, sans-serif'
     */
    font?: string;
}
/**
 * Probe the host page surrounding `el` and generate a complete --dt-* CSS string.
 *
 * @param el       The calendar's root element (or any element in the host page).
 * @param options  Optional overrides for mode, accent, font.
 * @returns        A CSS inline-style string of --dt-* custom properties.
 */
export declare function probeHostTheme(el: HTMLElement, options?: AutoThemeOptions): string;
/**
 * Observe changes to the host page that might affect theming
 * (color-scheme toggle, class changes on <html>/<body>, style attribute changes).
 *
 * Returns a cleanup function to stop observing.
 *
 * @param el        The calendar's root element.
 * @param callback  Called with the new CSS string whenever the host theme changes.
 * @param options   Passthrough to probeHostTheme.
 */
export declare function observeHostTheme(el: HTMLElement, callback: (vars: string) => void, options?: AutoThemeOptions): () => void;
