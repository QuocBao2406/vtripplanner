-- CreateEnum
CREATE TYPE "PlaceReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN');

-- CreateTable
CREATE TABLE "place_reviews" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" VARCHAR(2000),
    "status" "PlaceReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "moderationNote" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "place_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "place_reviews_placeId_status_createdAt_idx" ON "place_reviews"("placeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "place_reviews_userId_createdAt_idx" ON "place_reviews"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "place_reviews_rating_idx" ON "place_reviews"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "place_reviews_userId_placeId_key" ON "place_reviews"("userId", "placeId");

-- AddForeignKey
ALTER TABLE "place_reviews" ADD CONSTRAINT "place_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_reviews" ADD CONSTRAINT "place_reviews_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add database-level validation constraints.
ALTER TABLE "place_reviews"
ADD CONSTRAINT "place_reviews_rating_range_check"
CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "place_reviews"
ADD CONSTRAINT "place_reviews_content_nonblank_check"
CHECK (
    "content" IS NULL
    OR char_length(btrim("content")) > 0
);

-- Enable Row Level Security.
ALTER TABLE "place_reviews"
ENABLE ROW LEVEL SECURITY;
