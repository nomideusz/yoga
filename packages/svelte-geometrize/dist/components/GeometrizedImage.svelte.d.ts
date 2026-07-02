import type { HTMLImgAttributes } from 'svelte/elements';
import type { GeometrizePlaceholder } from '../core/types.js';
interface Props extends Omit<HTMLImgAttributes, 'src' | 'alt' | 'class' | 'placeholder'> {
    placeholder: GeometrizePlaceholder;
    src: string;
    alt: string;
    /** Class applied to the wrapper element. */
    class?: string;
    /** Delay between consecutive shapes appearing, in ms. Default 15. */
    stagger?: number;
    /** Fade-in duration of each individual shape, in ms. Default 400. */
    shapeDuration?: number;
    /** Crossfade duration of the photo once loaded, in ms. Default 600. */
    fadeDuration?: number;
}
declare const GeometrizedImage: import("svelte").Component<Props, {}, "">;
type GeometrizedImage = ReturnType<typeof GeometrizedImage>;
export default GeometrizedImage;
