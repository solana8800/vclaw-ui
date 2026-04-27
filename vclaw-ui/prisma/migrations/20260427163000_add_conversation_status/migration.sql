-- DropIndex
DROP INDEX "Conversation_provider_externalThreadId_key";

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "status" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_provider_externalThreadId_idx" ON "Conversation"("provider", "externalThreadId");

-- CreateIndex
CREATE INDEX "Conversation_customerId_idx" ON "Conversation"("customerId");

