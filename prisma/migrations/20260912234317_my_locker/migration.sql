-- Whiteboard note on User
ALTER TABLE "User" ADD COLUMN "lockerNote" TEXT;
ALTER TABLE "User" ADD COLUMN "lockerNoteUpdatedAt" TIMESTAMP(3);

-- Game log (attended games)
CREATE TABLE "GameLogEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "league" TEXT,
    "opponent" TEXT NOT NULL,
    "gameDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameLogEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GameLogEntry" ADD CONSTRAINT "GameLogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Photos (stored directly in Postgres — no blob storage set up)
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "caption" TEXT,
    "publicSlot" INTEGER,
    "gameLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Photo_userId_publicSlot_key" ON "Photo"("userId", "publicSlot");

ALTER TABLE "Photo" ADD CONSTRAINT "Photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_gameLogId_fkey" FOREIGN KEY ("gameLogId") REFERENCES "GameLogEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Trophies (championships)
CREATE TABLE "Trophy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trophy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Trophy_userId_league_teamId_season_key" ON "Trophy"("userId", "league", "teamId", "season");

ALTER TABLE "Trophy" ADD CONSTRAINT "Trophy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Medals (group game wins)
CREATE TABLE "Medal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "gameMode" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Medal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Medal_userId_groupId_gameMode_season_week_key" ON "Medal"("userId", "groupId", "gameMode", "season", "week");

ALTER TABLE "Medal" ADD CONSTRAINT "Medal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Medal" ADD CONSTRAINT "Medal_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
