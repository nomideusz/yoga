import type { StoredMedia } from "../core/types.js";
interface Props {
    images: StoredMedia[];
    getUrl: (prefix: string, entityId: string, filename: string, size: "thumbnail" | "medium" | "large") => string;
    onDelete?: (filename: string) => void;
    size?: "thumbnail" | "medium";
}
declare const ImageGallery: import("svelte").Component<Props, {}, "">;
type ImageGallery = ReturnType<typeof ImageGallery>;
export default ImageGallery;
