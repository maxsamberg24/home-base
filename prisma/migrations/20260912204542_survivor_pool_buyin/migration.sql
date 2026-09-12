-- Survivor pool buy-in: an agreed wager amount per entrant, locked once the
-- group is ready to start picking so the pot can't change mid-season.
ALTER TABLE "Group" ADD COLUMN "survivorBuyIn" DOUBLE PRECISION;
ALTER TABLE "Group" ADD COLUMN "survivorLocked" BOOLEAN NOT NULL DEFAULT false;
