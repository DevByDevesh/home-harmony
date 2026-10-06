/**
 * Server-only: owner visit management, enquiries, notifications and recently viewed.
 * Every query is scoped by the session user id (as requester, or as the listing owner).
 */
import { requireDb } from "../client.server";
import { visitTransitions, type VisitStatus } from "@/lib/visits";

type Db = Awaited<ReturnType<typeof requireDb>>;
type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];

export async function notify(db: Db | Tx, userId: string, type: string, title: string, message: string, metadata: Record<string, string>) {
  await db.notification.create({ data: { userId, type, title, message, metadata } });
}

const day = (d: Date) => d.toISOString().slice(0, 10);

// ---- Visits ----

export async function createVisit(userId: string, slug: string, date: string, time: string, notes?: string) {
  const db = await requireDb();
  const cleanDate = date.trim();
  const cleanTime = time.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return { ok: false as const, message: "Choose a valid visit date." };
  if (!/^\d{2}:\d{2}$/.test(cleanTime)) return { ok: false as const, message: "Choose a valid visit time." };

  const requestedDate = new Date(`${cleanDate}T00:00:00Z`);
  if (Number.isNaN(requestedDate.getTime())) return { ok: false as const, message: "Choose a valid visit date." };

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (requestedDate < todayUtc) return { ok: false as const, message: "Visit date cannot be in the past." };

  const property = await db.property.findFirst({
    where: { slug, status: "ACTIVE" },
    select: { id: true, ownerId: true, title: true, slug: true },
  });
  if (!property) return { ok: false as const, message: "This home is not available." };
  if (property.ownerId === userId) return { ok: false as const, message: "You cannot request a visit for your own listing." };

  const user = await db.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!user || user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    return { ok: false as const, message: "Your account cannot request visits." };
  }

  const visit = await db.visit.create({
    data: {
      userId,
      propertyId: property.id,
      requestedDate,
      requestedTime: cleanTime,
      notes: notes?.trim() || null,
      status: "REQUESTED",
    },
    select: { id: true },
  });

  await notify(
    db,
    property.ownerId,
    "VISIT_REQUESTED",
    "New visit request",
    `${property.title} · ${cleanDate} at ${cleanTime}`,
    { visitId: visit.id, slug: property.slug },
  );

  await notify(
    db,
    userId,
    "VISIT_SUBMITTED",
    "Visit request sent",
    property.title,
    { visitId: visit.id, slug: property.slug },
  );

  return { ok: true as const, visitId: visit.id };
}

export async function notifyVisitRequested(visitId: string) {
  const db = await requireDb();
  const v = await db.visit.findUnique({ where: { id: visitId }, select: { requestedDate: true, requestedTime: true, property: { select: { ownerId: true, title: true, slug: true } } } });
  if (!v) return;
  await notify(db, v.property.ownerId, "VISIT_REQUESTED", "New visit request", `${v.property.title} · ${day(v.requestedDate)} at ${v.requestedTime}`, { visitId, slug: v.property.slug });
}

export async function notifyVisitCancelled(visitId: string) {
  const db = await requireDb();
  const v = await db.visit.findUnique({ where: { id: visitId }, select: { status: true, property: { select: { ownerId: true, title: true, slug: true } } } });
  if (!v || v.status !== "CANCELLED") return;
  await notify(db, v.property.ownerId, "VISIT_CANCELLED", "Visit cancelled by visitor", v.property.title, { visitId, slug: v.property.slug });
}

export async function listOwnerVisits(ownerId: string) {
  const db = await requireDb();
  return db.visit.findMany({
    where: { property: { ownerId } }, orderBy: { createdAt: "desc" }, take: 200,
    select: { id: true, requestedDate: true, requestedTime: true, notes: true, status: true, createdAt: true, user: { select: { name: true } }, property: { select: { slug: true, title: true } } },
  });
}

/** Owner-only status change. Returns an error message, or null on success. */
export async function ownerUpdateVisit(ownerId: string, id: string, to: VisitStatus, date?: string, time?: string): Promise<string | null> {
  const db = await requireDb();
  return db.$transaction(async (tx) => {
    const v = await tx.visit.findFirst({ where: { id, property: { ownerId } }, select: { status: true, userId: true, property: { select: { title: true, slug: true } } } });
    if (!v) return "Visit not found for your listings.";
    if (!visitTransitions[v.status].includes(to)) return `A ${v.status.toLowerCase()} visit can’t be marked ${to.toLowerCase()}.`;
    if (to === "RESCHEDULED" && (!date || !time)) return "Choose a new date and time.";
    if (to === "RESCHEDULED") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date!) || !/^\d{2}:\d{2}$/.test(time!)) {
        return "Choose a valid new date and time.";
      }
      const nextDate = new Date(`${date}T00:00:00Z`);
      if (Number.isNaN(nextDate.getTime())) return "Choose a valid new date.";
      const today = new Date();
      const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      if (nextDate < todayUtc) return "Visit date cannot be in the past.";
    }
    const upd = await tx.visit.updateMany({
      where: { id, status: v.status },
      data: { status: to, handlerId: ownerId, ...(to === "CONFIRMED" ? { confirmedAt: new Date() } : {}), ...(to === "RESCHEDULED" ? { requestedDate: new Date(`${date}T00:00:00Z`), requestedTime: time! } : {}) },
    });
    if (!upd.count) return "This visit changed meanwhile. Refresh and try again.";
    const label = { CONFIRMED: "Visit confirmed", RESCHEDULED: "Visit rescheduled", COMPLETED: "Visit marked completed", CANCELLED: "Visit declined", REQUESTED: "Visit updated" }[to];
    await notify(tx, v.userId, `VISIT_${to}`, label, to === "RESCHEDULED" ? `${v.property.title} · new time ${date} at ${time}` : v.property.title, { visitId: id, slug: v.property.slug });
    return null;
  });
}

export async function listMyVisits(userId: string) {
  const db = await requireDb();
  return db.visit.findMany({
    where: { userId },
    orderBy: [{ requestedDate: "asc" }, { requestedTime: "asc" }],
    take: 200,
    select: {
      id: true, requestedDate: true, requestedTime: true, notes: true, status: true, createdAt: true,
      property: { select: { slug: true, title: true } },
    },
  });
}

export async function cancelMyVisit(userId: string, id: string): Promise<string | null> {
  const db = await requireDb();
  return db.$transaction(async (tx) => {
    const v = await tx.visit.findFirst({
      where: { id, userId },
      select: { status: true, property: { select: { ownerId: true, title: true, slug: true } } },
    });
    if (!v) return "Visit not found.";
    if (!visitTransitions[v.status].includes("CANCELLED")) return "This visit can no longer be cancelled.";

    const upd = await tx.visit.updateMany({
      where: { id, userId, status: v.status },
      data: { status: "CANCELLED" },
    });
    if (!upd.count) return "This visit changed meanwhile. Refresh and try again.";

    await notify(tx, v.property.ownerId, "VISIT_CANCELLED", "Visit cancelled", v.property.title, { visitId: id, slug: v.property.slug });
    return null;
  });
}

// ---- Enquiries ----

export async function createEnquiry(userId: string, slug: string, message: string) {
  const db = await requireDb();
  const p = await db.property.findFirst({ where: { slug, status: "ACTIVE" }, select: { id: true, ownerId: true, agentId: true, title: true } });
  if (!p) return null;
  if (p.ownerId === userId) return "own" as const;
  return db.$transaction(async (tx) => {
    const e = await tx.enquiry.create({ data: { userId, propertyId: p.id, handlerId: p.agentId ?? p.ownerId, message, status: "NEW" }, select: { id: true } });
    await notify(tx, p.ownerId, "ENQUIRY_RECEIVED", "New enquiry", p.title, { enquiryId: e.id, slug });
    if (p.agentId && p.agentId !== p.ownerId) await notify(tx, p.agentId, "LEAD_ASSIGNED", "New lead assigned", p.title, { enquiryId: e.id, slug });
    await notify(tx, userId, "ENQUIRY_SENT", "Enquiry sent", p.title, { enquiryId: e.id, slug });
    return e;
  });
}

const enquirySelect = { id: true, message: true, status: true, createdAt: true, property: { select: { slug: true, title: true } } } as const;
export async function listMyEnquiries(userId: string) {
  const db = await requireDb();
  return db.enquiry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 200, select: enquirySelect });
}
export async function listOwnerEnquiries(ownerId: string) {
  const db = await requireDb();
  return db.enquiry.findMany({ where: { property: { ownerId } }, orderBy: { createdAt: "desc" }, take: 200, select: { ...enquirySelect, user: { select: { name: true } } } });
}

// ---- Notifications ----

export async function listMyNotifications(userId: string) {
  const db = await requireDb();
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, type: true, title: true, message: true, readAt: true, createdAt: true } });
}

// ---- Recently viewed (stored in SearchPreference.extra.recent; no schema change) ----

export async function getRecent(userId: string): Promise<string[]> {
  const db = await requireDb();
  const p = await db.searchPreference.findUnique({ where: { userId }, select: { extra: true } });
  const r = (p?.extra as { recent?: unknown } | null)?.recent;
  return Array.isArray(r) ? r.filter((x): x is string => typeof x === "string") : [];
}
export async function setRecent(userId: string, slugs: string[]) {
  const db = await requireDb();
  const cur = await db.searchPreference.findUnique({ where: { userId }, select: { extra: true } });
  const extra = { ...((cur?.extra as Record<string, unknown> | null) ?? {}), recent: slugs };
  await db.searchPreference.upsert({ where: { userId }, create: { userId, extra }, update: { extra } });
}
// ---- Private chat ----

export async function getOrCreateConversation(userId: string, slug: string, firstMessage: string) {
  const db = await requireDb();
  const cleanFirstMessage = firstMessage.trim();

  if (!cleanFirstMessage || cleanFirstMessage.length > 2000) {
    return { ok: false as const, message: "Message must be between 1 and 2000 characters." };
  }

  const property = await db.property.findFirst({
    where: { slug, status: "ACTIVE" },
    select: { id: true, slug: true, title: true, ownerId: true, agentId: true },
  });

  if (!property) return { ok: false as const, message: "This home is not available." };
  if (property.ownerId === userId) return { ok: false as const, message: "You cannot message your own listing." };

  const participantId = property.agentId ?? property.ownerId;

  const sender = await db.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });

  if (!sender || sender.status === "SUSPENDED" || sender.status === "DEACTIVATED") {
    return { ok: false as const, message: "Your account cannot send messages." };
  }

  return db.$transaction(async (tx) => {
    let conversation = await tx.conversation.findUnique({
      where: {
        propertyId_buyerId_participantId: {
          propertyId: property.id,
          buyerId: userId,
          participantId,
        },
      },
      select: { id: true },
    });

    let enquiryId: string | null = null;

    if (!conversation) {
      conversation = await tx.conversation.create({
        data: {
          propertyId: property.id,
          buyerId: userId,
          participantId,
          lastMessageAt: new Date(),
        },
        select: { id: true },
      });

      const enquiry = await tx.enquiry.create({
        data: {
          userId,
          propertyId: property.id,
          handlerId: participantId,
          message: cleanFirstMessage,
          status: "NEW",
          conversationId: conversation.id,
        },
        select: { id: true },
      });

      enquiryId = enquiry.id;
    } else {
      const existingEnquiry = await tx.enquiry.findUnique({
        where: { conversationId: conversation.id },
        select: { id: true },
      });

      if (existingEnquiry) enquiryId = existingEnquiry.id;
    }

    await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        body: cleanFirstMessage,
      },
    });

    await tx.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    await notify(
      tx,
      participantId,
      "MESSAGE_RECEIVED",
      "New message",
      property.title,
      { conversationId: conversation.id, slug: property.slug }
    );

    return {
      ok: true as const,
      conversationId: conversation.id,
      enquiryId,
    };
  });
}

export async function listConversations(userId: string) {
  const db = await requireDb();

  return db.conversation.findMany({
    where: {
      OR: [{ buyerId: userId }, { participantId: userId }],
    },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    select: {
      id: true,
      lastMessageAt: true,
      createdAt: true,
      property: {
        select: {
          slug: true,
          title: true,
          city: true,
          locality: true,
        },
      },
      buyer: {
        select: {
          id: true,
          name: true,
        },
      },
      participant: {
        select: {
          id: true,
          name: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          body: true,
          createdAt: true,
          senderId: true,
          readAt: true,
        },
      },
    },
  });
}

export async function getConversation(userId: string, conversationId: string) {
  const db = await requireDb();

  return db.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ buyerId: userId }, { participantId: userId }],
    },
    select: {
      id: true,
      property: {
        select: {
          slug: true,
          title: true,
          city: true,
          locality: true,
        },
      },
      buyer: {
        select: {
          id: true,
          name: true,
        },
      },
      participant: {
        select: {
          id: true,
          name: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 500,
        select: {
          id: true,
          senderId: true,
          body: true,
          readAt: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function sendMessage(userId: string, conversationId: string, body: string) {
  const db = await requireDb();
  const clean = body.trim();

  if (!clean || clean.length > 2000) {
    return { ok: false as const, message: "Message must be between 1 and 2000 characters." };
  }

  const sender = await db.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });

  if (!sender || sender.status === "SUSPENDED" || sender.status === "DEACTIVATED") {
    return { ok: false as const, message: "Your account cannot send messages." };
  }

  return db.$transaction(async (tx) => {
    const conversation = await tx.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ buyerId: userId }, { participantId: userId }],
      },
      select: {
        id: true,
        property: { select: { title: true, slug: true } },
        buyerId: true,
        participantId: true,
      },
    });

    if (!conversation) {
      return { ok: false as const, message: "Conversation not found." };
    }

    const recipientId =
      conversation.buyerId === userId
        ? conversation.participantId
        : conversation.buyerId;

    const message = await tx.message.create({
      data: {
        conversationId,
        senderId: userId,
        body: clean,
      },
      select: {
        id: true,
        senderId: true,
        body: true,
        readAt: true,
        createdAt: true,
      },
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: message.createdAt,
      },
    });

    await tx.enquiry.updateMany({
      where: { conversationId },
      data: { lastActivityAt: message.createdAt },
    });

    await notify(
      tx,
      recipientId,
      "MESSAGE_RECEIVED",
      "New message",
      conversation.property.title,
      {
        conversationId,
        slug: conversation.property.slug,
      }
    );

    return { ok: true as const, message };
  });
}

export async function markConversationRead(userId: string, conversationId: string) {
  const db = await requireDb();

  const conversation = await db.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ buyerId: userId }, { participantId: userId }],
    },
    select: { id: true },
  });

  if (!conversation) return { ok: false as const };

  await db.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return { ok: true as const };
}
