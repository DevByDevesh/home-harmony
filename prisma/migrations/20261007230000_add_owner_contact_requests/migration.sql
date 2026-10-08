CREATE TYPE "OwnerContactRequestType" AS ENUM ('PHONE', 'CALL');
CREATE TYPE "OwnerContactRequestStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'REJECTED');

CREATE TABLE "OwnerContactRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "conversationId" TEXT,
  "type" "OwnerContactRequestType" NOT NULL,
  "status" "OwnerContactRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "preferredDate" DATE,
  "preferredTime" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "decidedAt" TIMESTAMP(3),
  CONSTRAINT "OwnerContactRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OwnerContactRequest_requesterId_createdAt_idx" ON "OwnerContactRequest"("requesterId", "createdAt");
CREATE INDEX "OwnerContactRequest_ownerId_status_createdAt_idx" ON "OwnerContactRequest"("ownerId", "status", "createdAt");
CREATE INDEX "OwnerContactRequest_propertyId_type_status_idx" ON "OwnerContactRequest"("propertyId", "type", "status");
CREATE INDEX "OwnerContactRequest_conversationId_idx" ON "OwnerContactRequest"("conversationId");

ALTER TABLE "OwnerContactRequest" ADD CONSTRAINT "OwnerContactRequest_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OwnerContactRequest" ADD CONSTRAINT "OwnerContactRequest_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OwnerContactRequest" ADD CONSTRAINT "OwnerContactRequest_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OwnerContactRequest" ADD CONSTRAINT "OwnerContactRequest_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
