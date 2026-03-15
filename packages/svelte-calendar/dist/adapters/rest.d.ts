/**
 * REST adapter skeleton — connect to any REST API.
 *
 * Override the URL builder and response mapper for your API shape.
 * This is a starting point; production use should add auth headers,
 * error handling, retry logic, etc.
 */
import type { TimelineEvent } from '../core/types.js';
import type { CalendarAdapter } from './types.js';
export interface RestAdapterOptions {
    /** Base URL of the API (e.g. "https://api.example.com/v1") */
    baseUrl: string;
    /** Custom headers (e.g. Authorization) */
    headers?: Record<string, string>;
    /** Map API response to TimelineEvent[] */
    mapEvents?: (data: unknown) => TimelineEvent[];
    /** Map API response to a single TimelineEvent */
    mapEvent?: (data: unknown) => TimelineEvent;
}
export declare function createRestAdapter(options: RestAdapterOptions): CalendarAdapter;
