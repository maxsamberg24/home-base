-- Friend codes are now created by the user (once) instead of auto-generated
-- at signup, so the column must allow NULL until they set one.
ALTER TABLE "User" ALTER COLUMN "friendCode" DROP NOT NULL;
