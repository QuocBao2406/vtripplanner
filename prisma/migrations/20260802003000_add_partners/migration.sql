-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM (
  'HOTEL',
  'HOMESTAY',
  'RESORT',
  'RESTAURANT',
  'EATERY',
  'CAFE',
  'ENTERTAINMENT_VENUE',
  'TOURIST_ATTRACTION',
  'TRANSPORT_PROVIDER',
  'RESCUE_SERVICE',
  'VEHICLE_REPAIR',
  'TRAVEL_SERVICE',
  'OTHER'
);

-- CreateTable
CREATE TABLE "partners" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ownerUserId" UUID NOT NULL,
  "reviewedByUserId" UUID,
  "name" VARCHAR(200) NOT NULL,
  "slug" VARCHAR(200) NOT NULL,
  "type" "PartnerType" NOT NULL,
  "description" VARCHAR(2000),
  "logoUrl" VARCHAR(2048),
  "phone" VARCHAR(30),
  "email" VARCHAR(320),
  "websiteUrl" VARCHAR(2048),
  "taxCode" VARCHAR(50),
  "businessLicenseUrl" VARCHAR(2048),
  "approvalStatus" "PartnerApprovalStatus" NOT NULL DEFAULT 'NOT_APPLIED',
  "rejectionReason" VARCHAR(1000),
  "submittedAt" TIMESTAMPTZ(6),
  "reviewedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "deletedAt" TIMESTAMPTZ(6),

  CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_branches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "partnerId" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "addressLine" VARCHAR(255) NOT NULL,
  "ward" VARCHAR(100),
  "district" VARCHAR(100),
  "province" VARCHAR(100) NOT NULL,
  "latitude" DECIMAL(9, 6),
  "longitude" DECIMAL(10, 6),
  "phone" VARCHAR(30),
  "email" VARCHAR(320),
  "isHeadOffice" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "deletedAt" TIMESTAMPTZ(6),

  CONSTRAINT "partner_branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partners_ownerUserId_key"
ON "partners"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "partners_slug_key"
ON "partners"("slug");

-- CreateIndex
CREATE INDEX "partners_reviewedByUserId_idx"
ON "partners"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "partners_type_idx"
ON "partners"("type");

-- CreateIndex
CREATE INDEX "partners_approvalStatus_idx"
ON "partners"("approvalStatus");

-- CreateIndex
CREATE INDEX "partners_deletedAt_idx"
ON "partners"("deletedAt");

-- CreateIndex
CREATE INDEX "partner_branches_partnerId_idx"
ON "partner_branches"("partnerId");

-- CreateIndex
CREATE INDEX "partner_branches_province_idx"
ON "partner_branches"("province");

-- CreateIndex
CREATE INDEX "partner_branches_isActive_idx"
ON "partner_branches"("isActive");

-- CreateIndex
CREATE INDEX "partner_branches_deletedAt_idx"
ON "partner_branches"("deletedAt");

-- AddForeignKey
ALTER TABLE "partners"
ADD CONSTRAINT "partners_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners"
ADD CONSTRAINT "partners_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_branches"
ADD CONSTRAINT "partner_branches_partnerId_fkey"
FOREIGN KEY ("partnerId")
REFERENCES "partners"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Enable Row Level Security
ALTER TABLE "partners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "partner_branches" ENABLE ROW LEVEL SECURITY;
