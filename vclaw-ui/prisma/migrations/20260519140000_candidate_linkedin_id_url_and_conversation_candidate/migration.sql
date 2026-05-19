-- LinkedIn profile ID URL (ACoAAA...) riêng với slug profileUrl
ALTER TABLE "Candidate" ADD COLUMN "linkedinProfileIdUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_linkedinProfileIdUrl_key" ON "Candidate"("linkedinProfileIdUrl");

-- Liên kết Conversation với Candidate (LinkedIn inbox)
ALTER TABLE "Conversation" ADD COLUMN "candidateId" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_candidateId_idx" ON "Conversation"("candidateId");
