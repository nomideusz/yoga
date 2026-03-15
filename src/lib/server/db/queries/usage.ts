import { db } from '../index';
import { apiUsage } from '../schema';
import { eq, sql } from 'drizzle-orm';

const PLACES_MONTHLY_LIMIT = 5000;

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

export async function checkPlacesBudget(): Promise<{ allowed: boolean; used: number }> {
  const month = currentMonth();
  const id = `places_${month}`;
  const row = await db.select({ calls: apiUsage.calls }).from(apiUsage).where(eq(apiUsage.id, id));
  const used = row[0]?.calls ?? 0;
  return { allowed: used < PLACES_MONTHLY_LIMIT, used };
}

export async function recordPlacesCall(count: number = 1): Promise<void> {
  const month = currentMonth();
  const id = `places_${month}`;
  await db
    .insert(apiUsage)
    .values({ id, apiName: 'places', month, calls: count })
    .onConflictDoUpdate({
      target: apiUsage.id,
      set: { calls: sql`${apiUsage.calls} + ${count}` },
    });
}
