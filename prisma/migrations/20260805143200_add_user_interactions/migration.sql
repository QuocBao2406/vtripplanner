-- CreateEnum
CREATE TYPE "UserInteractionType" AS ENUM ('VIEW', 'CLICK', 'OPEN_MAP');

-- CreateTable
CREATE TABLE "user_interactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "type" "UserInteractionType" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_interactions_userId_createdAt_idx" ON "user_interactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_interactions_placeId_type_createdAt_idx" ON "user_interactions"("placeId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EnableRowLevelSecurity
ALTER TABLE "user_interactions" ENABLE ROW LEVEL SECURITY;
