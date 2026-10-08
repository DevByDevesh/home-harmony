import { requireDb } from "../client.server";
import { canTransitionContactRequest, type OwnerContactRequestStatus, type OwnerContactRequestType } from "@/lib/owner-contact-requests";

type CreateInput = {
  requesterId: string;
  conversationId: string;
  type: OwnerContactRequestType;
  preferredDate?: string;
  preferredTime?: string;
};

async function getAuthorizedConversation(db: Awaited<ReturnType<typeof requireDb>>, requesterId: string, conversationId: string) {
  return db.conversation.findFirst({
    where: { id: conversationId, buyerId: requesterId },
    select: { id: true, property: { select: { id: true, slug: true, title: true, ownerId: true } } },
  });
}

export async function createOwnerContactRequest(input: CreateInput) {
  const db = await requireDb();
  const conversation = await getAuthorizedConversation(db, input.requesterId, input.conversationId);
  if (!conversation) return { ok: false as const, message: "Private conversation not found." };

  const owner = await db.ownerProfile.findUnique({
    where: { userId: conversation.property.ownerId },
    select: { contactPhone: true },
  });
  if (!owner?.contactPhone) {
    return { ok: false as const, message: "The owner has not configured a phone number yet." };
  }

  const active = await db.ownerContactRequest.findFirst({
    where: {
      requesterId: input.requesterId,
      propertyId: conversation.property.id,
      type: input.type,
      status: { in: ["REQUESTED", "ACCEPTED"] },
    },
    select: { id: true, status: true },
  });
  if (active?.status === "ACCEPTED") return { ok: true as const, requestId: active.id, alreadyAccepted: true as const };
  if (active) return { ok: false as const, message: "A request is already waiting for the owner." };

  const request = await db.$transaction(async (tx) => {
    const created = await tx.ownerContactRequest.create({
      data: {
        requesterId: input.requesterId,
        ownerId: conversation.property.ownerId,
        propertyId: conversation.property.id,
        conversationId: input.conversationId,
        type: input.type,
        preferredDate: input.preferredDate ? new Date(`${input.preferredDate}T00:00:00Z`) : null,
        preferredTime: input.preferredTime ?? null,
      },
      select: { id: true },
    });

    await tx.notification.create({
      data: {
        userId: conversation.property.ownerId,
        type: input.type === "PHONE" ? "OWNER_PHONE_REQUESTED" : "OWNER_CALL_REQUESTED",
        title: input.type === "PHONE" ? "Phone number requested" : "Call requested",
        message: input.type === "PHONE"
          ? `${conversation.property.title} · a seeker requested your phone number.`
          : `${conversation.property.title} · call requested for ${input.preferredDate} at ${input.preferredTime}.`,
        metadata: { contactRequestId: created.id, conversationId: input.conversationId, slug: conversation.property.slug },
      },
    });

    return created;
  });

  return { ok: true as const, requestId: request.id, alreadyAccepted: false as const };
}

export async function listRequesterContactRequests(requesterId: string) {
  const db = await requireDb();
  return db.ownerContactRequest.findMany({
    where: { requesterId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, type: true, status: true, preferredDate: true, preferredTime: true, createdAt: true, decidedAt: true,
      property: { select: { slug: true, title: true } },
      owner: { select: { ownerProfile: { select: { contactPhone: true } } } },
    },
  }).then(rows => rows.map(r => ({ ...r, ownerPhone: r.owner.ownerProfile?.contactPhone ?? null })));
}

export async function listOwnerContactRequests(ownerId: string) {
  const db = await requireDb();
  return db.ownerContactRequest.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, type: true, status: true, preferredDate: true, preferredTime: true, createdAt: true,
      property: { select: { slug: true, title: true } },
      requester: { select: { id: true, name: true } },
    },
  });
}

export async function respondOwnerContactRequest(ownerId: string, id: string, to: Exclude<OwnerContactRequestStatus, "REQUESTED">) {
  const db = await requireDb();
  return db.$transaction(async (tx) => {
    const request = await tx.ownerContactRequest.findFirst({
      where: { id, ownerId },
      select: {
        id: true, status: true, requesterId: true, type: true,
        property: { select: { title: true, slug: true } },
        owner: { select: { ownerProfile: { select: { contactPhone: true } } } },
      },
    });
    if (!request) return { ok: false as const, message: "Contact request not found." };
    if (!canTransitionContactRequest(request.status, to)) {
      return { ok: false as const, message: "This contact request has already been decided." };
    }
    if (to === "ACCEPTED" && !request.owner.ownerProfile?.contactPhone) {
      return { ok: false as const, message: "Add your phone number in Owner Profile before accepting." };
    }

    const updated = await tx.ownerContactRequest.updateMany({
      where: { id, ownerId, status: "REQUESTED" },
      data: { status: to, decidedAt: new Date() },
    });
    if (!updated.count) return { ok: false as const, message: "This request changed meanwhile. Refresh and try again." };

    await tx.notification.create({
      data: {
        userId: request.requesterId,
        type: to === "ACCEPTED" ? "OWNER_CONTACT_ACCEPTED" : "OWNER_CONTACT_REJECTED",
        title: to === "ACCEPTED" ? "Owner approved contact" : "Owner declined contact",
        message: to === "ACCEPTED"
          ? `${request.property.title} · the owner approved your contact request.`
          : `${request.property.title} · the owner declined your contact request.`,
        metadata: { contactRequestId: request.id, slug: request.property.slug },
      },
    });

    return { ok: true as const, status: to };
  });
}
