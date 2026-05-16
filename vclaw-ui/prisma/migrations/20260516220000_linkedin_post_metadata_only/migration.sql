-- Redefine JobLinkedInPost: chỉ metadata, bỏ content và note
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_JobLinkedInPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobPositionId" TEXT NOT NULL,
    "postUrl" TEXT,
    "title" TEXT,
    "target" TEXT,
    "companyUrl" TEXT,
    "hasImage" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobLinkedInPost_jobPositionId_fkey" FOREIGN KEY ("jobPositionId") REFERENCES "JobPosition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_JobLinkedInPost" ("id", "jobPositionId", "postUrl", "title", "target", "companyUrl", "hasImage", "postedAt")
SELECT "id", "jobPositionId", "postUrl", "title", "target", "companyUrl", "hasImage", "postedAt"
FROM "JobLinkedInPost";

DROP TABLE "JobLinkedInPost";
ALTER TABLE "new_JobLinkedInPost" RENAME TO "JobLinkedInPost";

CREATE INDEX "JobLinkedInPost_jobPositionId_postedAt_idx" ON "JobLinkedInPost"("jobPositionId", "postedAt");

PRAGMA foreign_keys=ON;
