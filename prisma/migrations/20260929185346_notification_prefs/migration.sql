ALTER TABLE "User" ADD COLUMN "phoneNumber" TEXT;

ALTER TABLE "FavoriteTeam" ADD COLUMN "notifyGameStart" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FavoriteTeam" ADD COLUMN "notifyScoreUpdates" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FavoriteTeam" ADD COLUMN "notifyFinalScore" BOOLEAN NOT NULL DEFAULT false;
