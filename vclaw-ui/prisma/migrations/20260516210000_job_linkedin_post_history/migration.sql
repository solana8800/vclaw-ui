-- AlterTable
ALTER TABLE "JobPosition" ADD COLUMN "linkedinPostedAt" DATETIME;

-- CreateTable
CREATE TABLE "JobLinkedInPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobPositionId" TEXT NOT NULL,
    "postUrl" TEXT,
    "title" TEXT,
    "content" TEXT,
    "target" TEXT,
    "companyUrl" TEXT,
    "hasImage" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "postedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobLinkedInPost_jobPositionId_fkey" FOREIGN KEY ("jobPositionId") REFERENCES "JobPosition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "JobLinkedInPost_jobPositionId_postedAt_idx" ON "JobLinkedInPost"("jobPositionId", "postedAt");
