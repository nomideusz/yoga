import { db } from '../index';
import { schoolReviews } from '../schema';
import { eq } from 'drizzle-orm';
import type { ReviewData } from './types';

export async function getReviewsBySchoolId(schoolId: string): Promise<ReviewData[]> {
  const rows = await db
    .select({
      id: schoolReviews.id,
      authorName: schoolReviews.authorName,
      rating: schoolReviews.rating,
      text: schoolReviews.text,
      relativeTime: schoolReviews.relativeTime,
      publishedAt: schoolReviews.publishedAt,
      language: schoolReviews.language,
    })
    .from(schoolReviews)
    .where(eq(schoolReviews.schoolId, schoolId));
  return rows;
}
