-- CreateEnum
CREATE TYPE "TravelPostType" AS ENUM ('USER_TRIP', 'SEASONAL_GUIDE', 'EVERGREEN_GUIDE', 'PROMOTED');

-- CreateEnum
CREATE TYPE "TravelPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "TravelPostMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "TravelPostReactionType" AS ENUM ('LIKE', 'LOVE', 'WOW');

-- CreateEnum
CREATE TYPE "TravelPostCommentStatus" AS ENUM ('PUBLISHED', 'HIDDEN');

-- CreateTable
CREATE TABLE "travel_posts" (
    "id" UUID NOT NULL,
    "authorUserId" UUID,
    "type" "TravelPostType" NOT NULL DEFAULT 'USER_TRIP',
    "status" "TravelPostStatus" NOT NULL DEFAULT 'DRAFT',
    "headline" VARCHAR(220),
    "caption" VARCHAR(5000),
    "seasonMonths" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "publishedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "travel_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_post_media" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "type" "TravelPostMediaType" NOT NULL,
    "storagePath" VARCHAR(1024) NOT NULL,
    "mimeType" VARCHAR(100),
    "fileSizeBytes" INTEGER,
    "durationSeconds" INTEGER,
    "altText" VARCHAR(255),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_post_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_post_places" (
    "postId" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "travel_post_places_pkey" PRIMARY KEY ("postId","placeId")
);

-- CreateTable
CREATE TABLE "travel_post_reactions" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "TravelPostReactionType" NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "travel_post_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_post_comments" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "status" "TravelPostCommentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "moderationNote" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "travel_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "travel_posts_authorUserId_createdAt_idx" ON "travel_posts"("authorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "travel_posts_status_publishedAt_idx" ON "travel_posts"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "travel_posts_type_status_publishedAt_idx" ON "travel_posts"("type", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "travel_posts_deletedAt_idx" ON "travel_posts"("deletedAt");

-- CreateIndex
CREATE INDEX "travel_post_media_postId_sortOrder_idx" ON "travel_post_media"("postId", "sortOrder");

-- CreateIndex
CREATE INDEX "travel_post_media_type_idx" ON "travel_post_media"("type");

-- CreateIndex
CREATE INDEX "travel_post_places_postId_sortOrder_idx" ON "travel_post_places"("postId", "sortOrder");

-- CreateIndex
CREATE INDEX "travel_post_places_placeId_idx" ON "travel_post_places"("placeId");

-- CreateIndex
CREATE INDEX "travel_post_places_placeId_isPrimary_idx" ON "travel_post_places"("placeId", "isPrimary");

-- CreateIndex
CREATE INDEX "travel_post_reactions_postId_type_createdAt_idx" ON "travel_post_reactions"("postId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "travel_post_reactions_userId_createdAt_idx" ON "travel_post_reactions"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "travel_post_reactions_postId_userId_key" ON "travel_post_reactions"("postId", "userId");

-- CreateIndex
CREATE INDEX "travel_post_comments_postId_status_createdAt_idx" ON "travel_post_comments"("postId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "travel_post_comments_userId_createdAt_idx" ON "travel_post_comments"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "travel_post_comments_deletedAt_idx" ON "travel_post_comments"("deletedAt");

-- AddForeignKey
ALTER TABLE "travel_posts" ADD CONSTRAINT "travel_posts_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_post_media" ADD CONSTRAINT "travel_post_media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "travel_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_post_places" ADD CONSTRAINT "travel_post_places_postId_fkey" FOREIGN KEY ("postId") REFERENCES "travel_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_post_places" ADD CONSTRAINT "travel_post_places_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_post_reactions" ADD CONSTRAINT "travel_post_reactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "travel_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_post_reactions" ADD CONSTRAINT "travel_post_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_post_comments" ADD CONSTRAINT "travel_post_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "travel_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_post_comments" ADD CONSTRAINT "travel_post_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
