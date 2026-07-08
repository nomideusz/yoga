import type { StorageAdapter, StoredMedia, ImageSize, MediaConfig, ValidationResult } from './types.js';
export declare const IMAGE_SIZES: {
    thumbnail: {
        width: number;
        height: number;
        fit: "cover";
    };
    medium: {
        width: number;
        height: number;
        fit: "inside";
    };
    large: {
        width: number;
        height: number;
        fit: "inside";
    };
};
export declare function validateImageFile(file: File, config?: MediaConfig): ValidationResult;
export declare function generateMediaKey(_originalName?: string): string;
export declare function getStorageKey(prefix: string, entityId: string, filename: string, size: ImageSize): string;
export declare function processAndStore(adapter: StorageAdapter, file: File, prefix: string, entityId: string, config?: MediaConfig): Promise<StoredMedia>;
export declare function deleteMedia(adapter: StorageAdapter, prefix: string, entityId: string, filename: string): Promise<void>;
export declare function getMediaUrl(adapter: StorageAdapter, prefix: string, entityId: string, filename: string, size?: ImageSize): string;
