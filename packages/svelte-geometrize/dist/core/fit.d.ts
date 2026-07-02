import type { GeometrizeOptions, GeometrizePlaceholder } from './types.js';
export declare const DEFAULT_OPTIONS: Required<Omit<GeometrizeOptions, 'maxSize'>> & {
    maxSize: number;
};
/**
 * Fits geometric shapes to raw RGBA pixel data. Pure CPU work — no I/O, no DOM.
 *
 * @param rgba RGBA pixel data, length must be width * height * 4
 * @param width pixel width of the data
 * @param height pixel height of the data
 * @param sourceWidth intrinsic width of the original (pre-downscale) image
 * @param sourceHeight intrinsic height of the original image
 */
export declare function fitShapes(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number, sourceWidth?: number, sourceHeight?: number, options?: GeometrizeOptions): GeometrizePlaceholder;
