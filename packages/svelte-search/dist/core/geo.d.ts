/** Haversine distance in km between two points. */
export declare function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number;
/** Estimated walking time in minutes (1.3x for non-straight routes). */
export declare function walkingMinutes(km: number): number;
/** Bounding box for fast SQL pre-filter before exact Haversine. */
export declare function boundingBox(lat: number, lng: number, radiusKm: number): {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
};
/** Format distance: <1km → "850 m", ≥1km → "2.3 km" */
export declare function formatDistance(km: number): string;
/** Format walking time: <60 → "12 min walk", ≥60 → "1 hr 15 min walk" */
export declare function formatWalkingTime(min: number): string;
/**
 * Get real walking route from OSRM. Call only for top N results.
 * Self-host OSRM with foot.lua profile for production.
 * Falls back gracefully to null on any error.
 */
export declare function walkingRoute(fromLat: number, fromLng: number, toLat: number, toLng: number, osrmBase?: string): Promise<{
    distanceM: number;
    durationS: number;
} | null>;
