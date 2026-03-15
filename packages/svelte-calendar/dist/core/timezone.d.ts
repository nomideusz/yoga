/**
 * Convert a Date (assumed UTC or local) to a Date representing
 * the same instant in the target timezone.
 *
 * The returned Date's local getters (getHours, getMinutes, etc.)
 * will return the values as they appear in the target timezone.
 */
export declare function toZonedTime(date: Date | number, timezone: string): Date;
/**
 * Convert a "zoned" Date (whose local getters represent a specific timezone)
 * back to a true UTC Date. Use this before persisting to a backend.
 */
export declare function fromZonedTime(date: Date | number, timezone: string): Date;
/**
 * Get the current time as it appears in the given timezone.
 */
export declare function nowInZone(timezone: string): Date;
/**
 * Format a Date in a specific timezone using Intl.DateTimeFormat.
 * Returns a locale-aware string.
 */
export declare function formatInTimeZone(date: Date | number, timezone: string, options?: Intl.DateTimeFormatOptions, locale?: string): string;
