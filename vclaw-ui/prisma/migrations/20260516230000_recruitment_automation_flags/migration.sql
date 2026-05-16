-- AlterTable
ALTER TABLE "RecruitmentSettings" ADD COLUMN "autoInviteOnMatch" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RecruitmentSettings" ADD COLUMN "autoIntroOnAccept" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RecruitmentSettings" ADD COLUMN "autoCollectOnPositive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RecruitmentSettings" ADD COLUMN "autoRemindInterview" BOOLEAN NOT NULL DEFAULT false;
