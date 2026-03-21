import type { TrackSearchEvent } from './types.js';
export interface TrackerConfig {
    /** API endpoint to POST events to (default: '/api/search-events') */
    endpoint?: string;
    /** sessionStorage key (default: 'search_sid') */
    sessionKey?: string;
}
export declare function createTracker(config?: TrackerConfig): {
    track: (event: TrackSearchEvent) => void;
};
