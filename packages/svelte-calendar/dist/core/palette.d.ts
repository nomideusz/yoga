/**
 * Smart auto-color palette generator.
 *
 * Given a base accent hex (e.g. from `--dt-accent`), generates a
 * palette of perceptually distinct colors that harmonize with the theme.
 *
 * Usage:
 *   generatePalette('#ef4444', 8)  // 8 theme-harmonious colors
 *   generatePalette(undefined, 8)  // falls back to the vivid default
 */
export declare const VIVID_PALETTE: string[];
/**
 * Extract the --dt-accent hex value from a theme CSS string.
 * Returns undefined if not found.
 */
export declare function extractAccent(themeString: string): string | undefined;
/**
 * Generate `count` visually distinct and theme-harmonious colors
 * by rotating hue evenly from the base accent, keeping saturation
 * and lightness within a pleasant range.
 *
 * Dark themes (l < 0.5): bump lightness to 0.55–0.65 so colors pop on dark bg.
 * Light themes (l ≥ 0.5): pull lightness to 0.38–0.48 so colors read on light bg.
 *
 * @param accent  Hex color string (e.g. '#ef4444'). If undefined, returns VIVID_PALETTE.
 * @param count   Number of colors to generate (default: 15).
 */
export declare function generatePalette(accent?: string, count?: number): string[];
