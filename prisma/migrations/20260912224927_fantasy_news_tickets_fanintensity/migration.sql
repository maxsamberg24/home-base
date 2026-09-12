-- Fan intensity on followed teams
ALTER TABLE "FavoriteTeam" ADD COLUMN "fanIntensity" TEXT NOT NULL DEFAULT 'CASUAL';

-- Ticket-price "I'm going" flag
CREATE TABLE "GameAttendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameAttendance_userId_league_eventId_key" ON "GameAttendance"("userId", "league", "eventId");

ALTER TABLE "GameAttendance" ADD CONSTRAINT "GameAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Group message board
CREATE TABLE "GroupPost" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "league" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupPost_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GroupPost" ADD CONSTRAINT "GroupPost_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupPost" ADD CONSTRAINT "GroupPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Weekly best-lineup fantasy game
CREATE TABLE "FantasyLineup" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" INTEGER NOT NULL DEFAULT 2,
    "roster" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FantasyLineup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FantasyLineup_groupId_userId_season_week_key" ON "FantasyLineup"("groupId", "userId", "season", "week");

ALTER TABLE "FantasyLineup" ADD CONSTRAINT "FantasyLineup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FantasyLineup" ADD CONSTRAINT "FantasyLineup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
