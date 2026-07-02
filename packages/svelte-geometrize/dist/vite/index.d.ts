import type { Plugin } from 'vite';
import type { GeometrizeOptions } from '../core/types.js';
/**
 * Vite plugin: `import placeholder from './photo.jpg?geometrize'` resolves to
 * a GeometrizePlaceholder object, fitted at build time.
 *
 * Per-import overrides via query params:
 * `./photo.jpg?geometrize&shapes=150&alpha=160&maxSize=160&shapeTypes=triangle,ellipse`
 */
export declare function geometrize(defaults?: GeometrizeOptions): Plugin;
