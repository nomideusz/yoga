import type { StorageAdapter } from './types.js';
export interface LocalConfig {
    /** Absolute path to the storage root directory, e.g. '/data/images' */
    root: string;
}
export declare function createLocalAdapter(config: LocalConfig): StorageAdapter;
