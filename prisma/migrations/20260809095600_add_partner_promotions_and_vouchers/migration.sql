CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "PromotionDiscountType" AS ENUM ('PERCENT', 'FIXED_AMOUNT');
CREATE TYPE "VoucherClaimStatus" AS ENUM ('CLAIMED', 'USED', 'EXPIRED');

CREATE TABLE "promotions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "partnerId" UUID NOT NULL,
  "createdByUserId" UUID,
  "reviewedByUserId" UUID,
  "title" VARCHAR(200) NOT NULL,
  "description" VARCHAR(2000) NOT NULL,
  "terms" VARCHAR(3000),
  "discountType" "PromotionDiscountType" NOT NULL,
  "discountValue" DECIMAL(14,2) NOT NULL,
  "maxDiscountAmount" DECIMAL(14,2),
  "minimumSpend" DECIMAL(14,2),
  "startAt" TIMESTAMPTZ(6) NOT NULL,
  "endAt" TIMESTAMPTZ(6) NOT NULL,
  "totalQuantity" INTEGER,
  "status" "PromotionStatus" NOT NULL DEFAULT 'DRAFT',
  "rejectionReason" VARCHAR(1000),
  "submittedAt" TIMESTAMPTZ(6),
  "reviewedAt" TIMESTAMPTZ(6),
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ(6),
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "promotion_places" (
  "promotionId" UUID NOT NULL,
  "placeId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promotion_places_pkey" PRIMARY KEY ("promotionId", "placeId")
);

CREATE TABLE "voucher_claims" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "promotionId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "status" "VoucherClaimStatus" NOT NULL DEFAULT 'CLAIMED',
  "claimedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "usedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "voucher_claims_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "promotions_partnerId_idx" ON "promotions"("partnerId");
CREATE INDEX "promotions_createdByUserId_idx" ON "promotions"("createdByUserId");
CREATE INDEX "promotions_reviewedByUserId_idx" ON "promotions"("reviewedByUserId");
CREATE INDEX "promotions_status_idx" ON "promotions"("status");
CREATE INDEX "promotions_startAt_endAt_idx" ON "promotions"("startAt", "endAt");
CREATE INDEX "promotions_isActive_idx" ON "promotions"("isActive");
CREATE INDEX "promotions_deletedAt_idx" ON "promotions"("deletedAt");
CREATE INDEX "promotion_places_placeId_idx" ON "promotion_places"("placeId");
CREATE UNIQUE INDEX "voucher_claims_code_key" ON "voucher_claims"("code");
CREATE UNIQUE INDEX "voucher_claims_promotionId_userId_key" ON "voucher_claims"("promotionId", "userId");
CREATE INDEX "voucher_claims_userId_idx" ON "voucher_claims"("userId");
CREATE INDEX "voucher_claims_status_idx" ON "voucher_claims"("status");
CREATE INDEX "voucher_claims_expiresAt_idx" ON "voucher_claims"("expiresAt");

ALTER TABLE "promotions" ADD CONSTRAINT "promotions_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "promotion_places" ADD CONSTRAINT "promotion_places_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_places" ADD CONSTRAINT "promotion_places_placeId_fkey"
  FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "voucher_claims" ADD CONSTRAINT "voucher_claims_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "voucher_claims" ADD CONSTRAINT "voucher_claims_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
