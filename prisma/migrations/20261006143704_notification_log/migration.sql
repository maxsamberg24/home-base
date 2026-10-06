CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationLog_userId_league_teamId_eventId_kind_key" ON "NotificationLog"("userId", "league", "teamId", "eventId", "kind");

ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
