import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const id = z.string().min(8).max(64);
const days = z.number().int().min(1).max(30);

async function requirePromotionAdmin() {
  const { requirePermission } = await import("./auth/guards.server");
  return requirePermission("listings.moderate");
}

export const listPromotionsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requirePromotionAdmin();
  const { requireDb } = await import("./db/client.server");
  const db = await requireDb();
  const rows = await db.featuredListing.findMany({
    orderBy: { endsAt: "desc" }, take: 200,
    include: { property: { select: { id: true, title: true, slug: true, city: true, status: true } } },
  });
  return rows.map(r => ({ id:r.id, propertyId:r.propertyId, title:r.property.title, slug:r.property.slug, city:r.property.city, status:r.property.status, promotionType:r.promotionType, active:r.active && r.endsAt > new Date(), startsAt:r.startsAt.toISOString(), endsAt:r.endsAt.toISOString() }));
});

export const createPromotionFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ propertyId:id, promotionType:z.enum(["FEATURED","BOOST"]), days }).strict().parse(d))
  .handler(async ({data}) => {
    const actor = await requirePromotionAdmin();
    const { requireDb } = await import("./db/client.server");
    const db = await requireDb();
    const property = await db.property.findFirst({ where:{id:data.propertyId,status:"ACTIVE",images:{some:{}}}, select:{id:true,title:true} });
    if (!property) return {ok:false as const,message:"Only active listings with photos can be promoted."};
    const now = new Date(); const ends = new Date(now.getTime()+data.days*864e5);
    const row = await db.featuredListing.create({ data:{propertyId:data.propertyId,promotionType:data.promotionType,startsAt:now,endsAt:ends,active:true,createdById:actor.id} });
    await db.auditLog.create({data:{actorId:actor.id,action:`Promotion created: ${data.promotionType}`,entityType:"Property",entityId:data.propertyId,metadata:{days:data.days}}});
    return {ok:true as const,id:row.id};
  });

export const stopPromotionFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id }).strict().parse(d))
  .handler(async ({data}) => {
    const actor = await requirePromotionAdmin();
    const { requireDb } = await import("./db/client.server");
    const db = await requireDb();
    const row = await db.featuredListing.updateMany({where:{id:data.id,active:true},data:{active:false,endsAt:new Date()}});
    if (!row.count) return {ok:false as const,message:"Promotion not found or already inactive."};
    await db.auditLog.create({data:{actorId:actor.id,action:"Promotion stopped",entityType:"FeaturedListing",entityId:data.id}});
    return {ok:true as const};
  });
