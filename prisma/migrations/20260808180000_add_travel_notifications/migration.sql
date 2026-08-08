-- VTripPlanner 7.13T
-- Minimal in-app notifications for reactions and comments on user trip posts.

CREATE TYPE "TravelNotificationType" AS ENUM (
    'REACTION',
    'COMMENT'
);

CREATE TABLE "travel_notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "type" "TravelNotificationType" NOT NULL,
    "reactionType" "TravelPostReactionType",
    "commentPreview" VARCHAR(160),
    "sourceKey" VARCHAR(200) NOT NULL,
    "readAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_notifications_pkey"
      PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "travel_notifications_sourceKey_key"
ON "travel_notifications"("sourceKey");

CREATE INDEX "travel_notifications_userId_readAt_createdAt_idx"
ON "travel_notifications"("userId", "readAt", "createdAt");

CREATE INDEX "travel_notifications_postId_createdAt_idx"
ON "travel_notifications"("postId", "createdAt");

ALTER TABLE "travel_notifications"
ADD CONSTRAINT "travel_notifications_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "travel_notifications"
ADD CONSTRAINT "travel_notifications_actorUserId_fkey"
FOREIGN KEY ("actorUserId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "travel_notifications"
ADD CONSTRAINT "travel_notifications_postId_fkey"
FOREIGN KEY ("postId")
REFERENCES "travel_posts"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
