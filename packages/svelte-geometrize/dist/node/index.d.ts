import type { GeometrizeOptions, GeometrizePlaceholder } from '../core/types.js';
export { fitShapes, DEFAULT_OPTIONS } from '../core/fit.js';
export { placeholderToSvg, placeholderToDataUri } from '../core/svg.js';
export type { GeometrizeOptions, GeometrizePlaceholder, ShapeKind } from '../core/types.js';
/**
 * Generates a placeholder from an image file or buffer. Decodes with sharp,
 * downscales to `maxSize` (fitting cost scales with pixel count; the SVG
 * scales back up losslessly), then fits shapes.
 */
export declare function generatePlaceholder(input: string | Buffer, options?: GeometrizeOptions): Promise<GeometrizePlaceholder>;
