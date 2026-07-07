import { db } from '../index';
import { walkingDistances } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

// Stale-entry cleanup at most once a day per process — this used to run on
// every call, a full-table DELETE scan in the hottest path.
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
let lastCleanupAt = 0;

export async function getCachedDistances(
  originLat: number,
  originLng: number,
  schoolIds: string[],
): Promise<Map<string, { distanceMeters: number; durationMinutes: number }>> {
  if (schoolIds.length === 0) return new Map();

  // Round to ~100m grid
  const lat = Math.round(originLat * 1000) / 1000;
  const lng = Math.round(originLng * 1000) / 1000;

  if (Date.now() - lastCleanupAt > CLEANUP_INTERVAL_MS) {
    lastCleanupAt = Date.now();
    // Fire-and-forget: cache reads shouldn't wait on (or fail with) housekeeping
    db.delete(walkingDistances)
      .where(sql`${walkingDistances.createdAt} < datetime('now', '-30 days')`)
      .catch((err) => console.error('walking_distances cleanup failed:', err));
  }

  const rows = await db
    .select({
      schoolId: walkingDistances.schoolId,
      distanceMeters: walkingDistances.distanceMeters,
      durationMinutes: walkingDistances.durationMinutes,
    })
    .from(walkingDistances)
    .where(
      and(
        eq(walkingDistances.originLat, lat),
        eq(walkingDistances.originLng, lng),
        sql`${walkingDistances.schoolId} IN (${sql.join(schoolIds.map(id => sql`${id}`), sql`, `)})`
      )
    );

  const map = new Map<string, { distanceMeters: number; durationMinutes: number }>();
  for (const row of rows) {
    map.set(row.schoolId, { distanceMeters: row.distanceMeters, durationMinutes: row.durationMinutes });
  }
  return map;
}

export async function cacheDistances(
  originLat: number,
  originLng: number,
  distances: Array<{ schoolId: string; distanceMeters: number; durationMinutes: number }>,
): Promise<void> {
  const lat = Math.round(originLat * 1000) / 1000;
  const lng = Math.round(originLng * 1000) / 1000;

  for (const d of distances) {
    const id = `${lat}_${lng}_${d.schoolId}`;
    await db
      .insert(walkingDistances)
      .values({
        id,
        originLat: lat,
        originLng: lng,
        schoolId: d.schoolId,
        distanceMeters: d.distanceMeters,
        durationMinutes: d.durationMinutes,
      })
      .onConflictDoUpdate({
        target: walkingDistances.id,
        set: {
          distanceMeters: d.distanceMeters,
          durationMinutes: d.durationMinutes,
          createdAt: sql`(datetime('now'))`,
        },
      });
  }
}
