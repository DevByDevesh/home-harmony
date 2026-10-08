import { requireDb } from "../client.server";

export type PropertyReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: string;
};

export async function listPropertyReviews(slug: string): Promise<{ average: number | null; count: number; reviews: PropertyReviewRow[] }> {
  const db = await requireDb();
  const property = await db.property.findUnique({
    where: { slug },
    select: {
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { name: true } } },
      },
    },
  });
  if (!property) return { average: null, count: 0, reviews: [] };
  const reviews = property.reviews.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt.toISOString(), author: r.user.name?.trim() || "HouseProvider user" }));
  const average = reviews.length ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10 : null;
  return { average, count: reviews.length, reviews };
}

export async function getPropertyReviewEligibility(propertyId: string, userId: string) {
  const db = await requireDb();
  const [visit, review] = await Promise.all([
    db.visit.findFirst({ where: { propertyId, userId, status: "COMPLETED" }, select: { id: true } }),
    db.propertyReview.findUnique({ where: { propertyId_userId: { propertyId, userId } }, select: { id: true } }),
  ]);
  return { eligible: !!visit && !review, alreadyReviewed: !!review };
}

export async function createPropertyReview(propertyId: string, userId: string, rating: number, comment: string | null) {
  const db = await requireDb();
  const completedVisit = await db.visit.findFirst({ where: { propertyId, userId, status: "COMPLETED" }, select: { id: true } });
  if (!completedVisit) return { ok: false as const, message: "Complete a property visit before leaving a review." };
  const existing = await db.propertyReview.findUnique({ where: { propertyId_userId: { propertyId, userId } }, select: { id: true } });
  if (existing) return { ok: false as const, message: "You have already reviewed this property." };
  const review = await db.propertyReview.create({ data: { propertyId, userId, rating, comment }, select: { id: true } });
  return { ok: true as const, id: review.id };
}
