-- VTripPlanner 7.14A
-- Persist per-user "not interested" choices for social feed posts.

CREATE TABLE "travel_post_hides" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_post_hides_pkey"
      PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "travel_post_hides_postId_userId_key"
ON "travel_post_hides"("postId", "userId");

CREATE INDEX "travel_post_hides_userId_createdAt_idx"
ON "travel_post_hides"("userId", "createdAt");

ALTER TABLE "travel_post_hides"
ADD CONSTRAINT "travel_post_hides_postId_fkey"
FOREIGN KEY ("postId")
REFERENCES "travel_posts"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "travel_post_hides"
ADD CONSTRAINT "travel_post_hides_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
