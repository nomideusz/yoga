import type { CalendarAdapter } from './types.js';
export interface JmapClient {
    request(calls: any[]): Promise<{
        methodResponses: [string, any, string][];
    }>;
}
export interface JmapCalendarAdapterOptions {
    getAccountId: () => string;
    calendarId?: string;
    timeZone?: string;
    /** Map JMAP calendar color/category names */
    calendars?: {
        id: string;
        name: string;
        color: string;
    }[] | (() => {
        id: string;
        name: string;
        color: string;
    }[]);
}
export declare function createJmapAdapter(client: JmapClient, options: JmapCalendarAdapterOptions): CalendarAdapter;
