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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ChannelNotification_channel_threadId_idx" ON "ChannelNotification"("channel", "threadId");

-- CreateIndex
CREATE INDEX "ChannelNotification_createdAt_idx" ON "ChannelNotification"("createdAt");
