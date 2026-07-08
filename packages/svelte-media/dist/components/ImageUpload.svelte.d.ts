import type { StoredMedia, MediaConfig } from '../core/types.js';
interface Props {
    onUpload: (file: File) => Promise<StoredMedia>;
    onError?: (message: string) => void;
    maxFiles?: number;
    accept?: string;
    config?: MediaConfig;
}
declare const ImageUpload: import("svelte").Component<Props, {}, "">;
type ImageUpload = ReturnType<typeof ImageUpload>;
export default ImageUpload;
