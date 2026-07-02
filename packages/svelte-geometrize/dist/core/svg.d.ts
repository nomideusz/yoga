import type { GeometrizePlaceholder } from './types.js';
/**
 * Serializes a placeholder to a standalone SVG string — useful for SSR,
 * emails, og-images, or a CSS background via data URI. No geometrize
 * dependency: safe to import in the browser.
 */
export declare function placeholderToSvg(placeholder: GeometrizePlaceholder): string;
/** Placeholder as a data URI, usable in `background-image` or `<img src>`. */
export declare function placeholderToDataUri(placeholder: GeometrizePlaceholder): string;
