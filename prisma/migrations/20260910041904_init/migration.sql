-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "favoriteTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonPrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "winTotals" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardPrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "AwardPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinePick" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" INTEGER NOT NULL DEFAULT 2,
    "eventId" TEXT NOT NULL,
    "guessedSpread" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinePick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StraightPick" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" INTEGER NOT NULL DEFAULT 2,
    "eventId" TEXT NOT NULL,
    "pickedTeamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StraightPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurvivorPick" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "seasonType" INTEGER NOT NULL DEFAULT 2,
    "eventId" TEXT NOT NULL,
    "pickedTeamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurvivorPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonPrediction_userId_season_key" ON "SeasonPrediction"("userId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "AwardPrediction_userId_season_category_key" ON "AwardPrediction"("userId", "season", "category");

-- CreateIndex
CREATE UNIQUE INDEX "LinePick_groupId_userId_eventId_key" ON "LinePick"("groupId", "userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "StraightPick_groupId_userId_eventId_key" ON "StraightPick"("groupId", "userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "SurvivorPick_groupId_userId_season_week_key" ON "SurvivorPick"("groupId", "userId", "season", "week");

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonPrediction" ADD CONSTRAINT "SeasonPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardPrediction" ADD CONSTRAINT "AwardPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinePick" ADD CONSTRAINT "LinePick_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinePick" ADD CONSTRAINT "LinePick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StraightPick" ADD CONSTRAINT "StraightPick_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StraightPick" ADD CONSTRAINT "StraightPick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurvivorPick" ADD CONSTRAINT "SurvivorPick_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurvivorPick" ADD CONSTRAINT "SurvivorPick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

