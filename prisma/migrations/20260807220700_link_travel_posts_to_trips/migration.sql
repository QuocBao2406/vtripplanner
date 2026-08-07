-- VTripPlanner 7.13L
-- Link an optional public social post to the owner's saved Trip.
-- The relation is nullable so ordinary posts and system guide posts stay unchanged.
-- Hard deletion of a Trip only clears the link; the social post itself is preserved.

ALTER TABLE "travel_posts"
ADD COLUMN "sourceTripId" UUID;

CREATE INDEX "travel_posts_sourceTripId_idx"
ON "travel_posts"("sourceTripId");

ALTER TABLE "travel_posts"
ADD CONSTRAINT "travel_posts_sourceTripId_fkey"
FOREIGN KEY ("sourceTripId")
REFERENCES "trips"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
