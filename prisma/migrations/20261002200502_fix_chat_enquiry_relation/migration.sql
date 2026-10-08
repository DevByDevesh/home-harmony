/*
  Warnings:

  - You are about to drop the column `enquiryId` on the `Conversation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[conversationId]` on the table `Enquiry` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_enquiryId_fkey";

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "enquiryId";

-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "conversationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_conversationId_key" ON "Enquiry"("conversationId");

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
