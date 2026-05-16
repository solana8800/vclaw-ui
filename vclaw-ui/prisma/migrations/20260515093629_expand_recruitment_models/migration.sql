-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN "aiAnalysisSummary" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "availability" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "chatInfo" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "conversationHistory" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "currentCompany" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "currentSalary" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "expectedSalary" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "extractedInfo" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "githubUrl" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "personalInfo" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "portfolioUrl" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "strengths" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JobPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirements" TEXT,
    "hiringPolicy" TEXT,
    "interviewProcess" TEXT,
    "salaryRange" TEXT,
    "benefits" TEXT,
    "companyInfo" TEXT,
    "publicInstructions" TEXT,
    "projectTeamInfo" TEXT,
    "headcount" INTEGER,
    "hiringTimeline" TEXT,
    "urgencyLevel" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "workspaceId" TEXT,
    "linkedinJobId" TEXT,
    "linkedinJobUrl" TEXT,
    "companyUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_JobPosition" ("companyUrl", "createdAt", "description", "id", "linkedinJobId", "linkedinJobUrl", "requirements", "status", "title", "updatedAt", "workspaceId") SELECT "companyUrl", "createdAt", "description", "id", "linkedinJobId", "linkedinJobUrl", "requirements", "status", "title", "updatedAt", "workspaceId" FROM "JobPosition";
DROP TABLE "JobPosition";
ALTER TABLE "new_JobPosition" RENAME TO "JobPosition";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
