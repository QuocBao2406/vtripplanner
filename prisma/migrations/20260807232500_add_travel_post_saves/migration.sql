-- VTripPlanner 7.13O
-- Add independent bookmarks for social posts.
-- Saving a post is separate from reacting to it.

CREATE TABLE "travel_post_saves" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_post_saves_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "travel_post_saves_postId_userId_key"
ON "travel_post_saves"("postId", "userId");

CREATE INDEX "travel_post_saves_userId_createdAt_idx"
ON "travel_post_saves"("userId", "createdAt");

ALTER TABLE "travel_post_saves"
ADD CONSTRAINT "travel_post_saves_postId_fkey"
FOREIGN KEY ("postId")
REFERENCES "travel_posts"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "travel_post_saves"
ADD CONSTRAINT "travel_post_saves_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
