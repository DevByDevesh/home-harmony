import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeReview } from "./review.validation";

function rethrow(e: unknown): never {
  if (e instanceof Error) throw new Error(e.message);
  throw e;
}

const slug = z.string().min(1).max(120);
const reviewSchema = z.object({
  slug,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000),
}).strict();

export const listPropertyReviewsFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const { listPropertyReviews } = await import("./db/repositories/reviews.server");
      return await listPropertyReviews(data.slug);
    } catch (e) {
      rethrow(e);
    }
  });

export const getMyPropertyReviewEligibilityFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireUser } = await import("./auth/guards.server");
      const { requireDb } = await import("./db/client.server");
      const { getPropertyReviewEligibility } = await import("./db/repositories/reviews.server");
      const me = await requireUser();
      const db = await requireDb();
      const property = await db.property.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (!property) return { eligible: false as const, alreadyReviewed: false as const };
      return await getPropertyReviewEligibility(property.id, me.id);
    } catch (e) {
      rethrow(e);
    }
  });

export const createPropertyReviewFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => reviewSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireUser } = await import("./auth/guards.server");
      const { requireDb } = await import("./db/client.server");
      const { writeAudit } = await import("./auth/audit.server");
      const { createPropertyReview } = await import("./db/repositories/reviews.server");
      const me = await requireUser();
      const db = await requireDb();
      const property = await db.property.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (!property) return { ok: false as const, message: "Property not found." };

      const review = normalizeReview({ rating: data.rating, comment: data.comment });
      const result = await createPropertyReview(property.id, me.id, review.rating, review.comment);
      if (!result.ok) return result;

      await writeAudit({
        actorId: me.id,
        action: "property.review.create",
        entityType: "PropertyReview",
        entityId: result.id,
        metadata: { propertyId: property.id, rating: review.rating },
      });
      return result;
    } catch (e) {
      rethrow(e);
    }
  });
