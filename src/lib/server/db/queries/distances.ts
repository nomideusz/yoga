import { db } from '../index';
import { walkingDistances } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export async function getCachedDistances(
  originLat: number,
  originLng: number,
  schoolIds: string[],
): Promise<Map<string, { distanceMeters: number; durationMinutes: number }>> {
  if (schoolIds.length === 0) return new Map();

  // Round to ~100m grid
  const lat = Math.round(originLat * 1000) / 1000;
  const lng = Math.round(originLng * 1000) / 1000;

  // Clean stale entries (>30 days)
  await db.delete(walkingDistances).where(
    sql`${walkingDistances.createdAt} < datetime('now', '-30 days')`
  );

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
