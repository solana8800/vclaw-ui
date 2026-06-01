-- Baseline gộp: thay thế toàn bộ migration incremental trước 2026-05-20.
--
-- DB mới / reset:
--   rm -f prisma/business.sqlite prisma/business.sqlite-*
--   pnpm exec prisma migrate deploy && pnpm prisma db seed
--
-- DB dev đang chạy (giữ data):
--   sqlite3 prisma/business.sqlite "DELETE FROM _prisma_migrations;"
--   pnpm exec prisma migrate resolve --applied 20260520140000_baseline

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "shippingAddress" TEXT,
    "channel" TEXT NOT NULL,
    "labels" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "gender" TEXT,
    "preferredName" TEXT
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "type" TEXT NOT NULL DEFAULT 'GOODS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "metadata" TEXT,
    "productCode" TEXT,
    "images" TEXT,
    "commercePolicyJson" TEXT
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fulfillmentType" TEXT NOT NULL DEFAULT 'PHYSICAL',
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "shippingAddress" TEXT,
    "trackingNumber" TEXT,
    "shippingEstimate" REAL,
    "shippingNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "evidenceImage" TEXT,
    "method" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "amount" TEXT,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "timeAgo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "shopName" TEXT,
    "preferredChannel" TEXT,
    "bankName" TEXT,
    "accountHolder" TEXT,
    "accountNumber" TEXT,
    "bankThreadId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "address" TEXT,
    "automationRulesJson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "shopLogoUrl" TEXT,
    "website" TEXT,
    "approvalConfigJson" TEXT,
    "language" TEXT DEFAULT 'vi',
    "notificationConfigJson" TEXT,
    "shipperGroupId" TEXT,
    "ghnToken" TEXT,
    "ghnShopId" TEXT,
    "ghnFromDistrictId" INTEGER,
    "shopCode" TEXT
);

-- CreateTable
CREATE TABLE "RecruitmentSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "linkedinCompanyUrl" TEXT,
    "autoInviteOnMatch" BOOLEAN NOT NULL DEFAULT false,
    "autoIntroOnAccept" BOOLEAN NOT NULL DEFAULT false,
    "autoCollectOnPositive" BOOLEAN NOT NULL DEFAULT false,
    "autoRemindInterview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IntegrationAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "accountId" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "connectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IntegrationGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "accountId" TEXT,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "memberCount" INTEGER,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IntegrationPeer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "accountId" TEXT,
    "peerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChannelConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "externalAccountId" TEXT,
    "profileJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "appId" TEXT
);

-- CreateTable
CREATE TABLE "AgentToolLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tool" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AutomationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "target" TEXT,
    "result" TEXT,
    "channel" TEXT,
    "notes" TEXT,
    "draftContent" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'NONE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChannelNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL DEFAULT '',
    "rawMessage" TEXT NOT NULL,
    "msgId" TEXT,
    "msgType" TEXT,
    "balance" REAL,
    "amount" REAL,
    "description" TEXT,
    "orderNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "industry" TEXT DEFAULT 'RETAIL',
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JobPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "linkedinPostCopy" TEXT,
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
    "contractType" TEXT,
    "workMode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "workspaceId" TEXT,
    "linkedinJobId" TEXT,
    "linkedinJobUrl" TEXT,
    "linkedinPostedAt" DATETIME,
    "companyUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JobLinkedInPost" (
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

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "headline" TEXT,
    "profileUrl" TEXT,
    "linkedinProfileIdUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'POTENTIAL',
    "cvText" TEXT,
    "cvFileUrl" TEXT,
    "extractedInfo" TEXT,
    "chatInfo" TEXT,
    "conversationHistory" TEXT,
    "strengths" TEXT,
    "personalInfo" TEXT,
    "githubUrl" TEXT,
    "portfolioUrl" TEXT,
    "currentCompany" TEXT,
    "availability" TEXT,
    "currentSalary" TEXT,
    "expectedSalary" TEXT,
    "aiAnalysisSummary" TEXT,
    "recruiterNotes" TEXT,
    "location" TEXT,
    "linkedinConnectionStatus" TEXT,
    "matchScore" INTEGER,
    "matchSummary" TEXT,
    "source" TEXT,
    "linkedinChatId" TEXT,
    "sentiment" TEXT,
    "labels" TEXT,
    "jobPositionId" TEXT,
    "workspaceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Candidate_jobPositionId_fkey" FOREIGN KEY ("jobPositionId") REFERENCES "JobPosition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "externalThreadId" TEXT NOT NULL,
    "customerId" TEXT,
    "candidateId" TEXT,
    "title" TEXT,
    "openclawSessionKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT,
    CONSTRAINT "Conversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Conversation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "externalMessageId" TEXT,
    "rawPayloadJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Product_productCode_key" ON "Product"("productCode");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationAccount_provider_key" ON "IntegrationAccount"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationGroup_groupId_key" ON "IntegrationGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationPeer_provider_peerId_key" ON "IntegrationPeer"("provider", "peerId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConnection_provider_key" ON "ChannelConnection"("provider");

-- CreateIndex
CREATE INDEX "Conversation_provider_externalThreadId_idx" ON "Conversation"("provider", "externalThreadId");

-- CreateIndex
CREATE INDEX "Conversation_customerId_idx" ON "Conversation"("customerId");

-- CreateIndex
CREATE INDEX "Conversation_candidateId_idx" ON "Conversation"("candidateId");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ChannelNotification_channel_threadId_idx" ON "ChannelNotification"("channel", "threadId");

-- CreateIndex
CREATE INDEX "ChannelNotification_createdAt_idx" ON "ChannelNotification"("createdAt");

-- CreateIndex
CREATE INDEX "JobLinkedInPost_jobPositionId_postedAt_idx" ON "JobLinkedInPost"("jobPositionId", "postedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_profileUrl_key" ON "Candidate"("profileUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_linkedinProfileIdUrl_key" ON "Candidate"("linkedinProfileIdUrl");
