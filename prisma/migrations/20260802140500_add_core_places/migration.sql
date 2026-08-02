-- CreateEnum
CREATE TYPE "PlaceVerificationStatus" AS ENUM (
  'DRAFT',
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'SUSPENDED'
);

-- CreateTable
CREATE TABLE "provinces" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(20) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provinceId" UUID NOT NULL,
  "code" VARCHAR(20) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "description" VARCHAR(500),
  "iconName" VARCHAR(100),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "place_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "partnerId" UUID,
  "partnerBranchId" UUID,
  "categoryId" UUID NOT NULL,
  "provinceId" UUID NOT NULL,
  "districtId" UUID,
  "createdByUserId" UUID,
  "reviewedByUserId" UUID,
  "name" VARCHAR(200) NOT NULL,
  "slug" VARCHAR(220) NOT NULL,
  "shortDescription" VARCHAR(500),
  "description" VARCHAR(5000),
  "addressLine" VARCHAR(255) NOT NULL,
  "ward" VARCHAR(100),
  "latitude" DECIMAL(9, 6),
  "longitude" DECIMAL(10, 6),
  "phone" VARCHAR(30),
  "email" VARCHAR(320),
  "websiteUrl" VARCHAR(2048),
  "verificationStatus" "PlaceVerificationStatus" NOT NULL DEFAULT 'DRAFT',
  "rejectionReason" VARCHAR(1000),
  "submittedAt" TIMESTAMPTZ(6),
  "reviewedAt" TIMESTAMPTZ(6),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "deletedAt" TIMESTAMPTZ(6),

  CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provinces_code_key"
ON "provinces"("code");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_slug_key"
ON "provinces"("slug");

-- CreateIndex
CREATE INDEX "provinces_name_idx"
ON "provinces"("name");

-- CreateIndex
CREATE INDEX "provinces_isActive_idx"
ON "provinces"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "districts_code_key"
ON "districts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "districts_provinceId_slug_key"
ON "districts"("provinceId", "slug");

-- CreateIndex
CREATE INDEX "districts_provinceId_idx"
ON "districts"("provinceId");

-- CreateIndex
CREATE INDEX "districts_name_idx"
ON "districts"("name");

-- CreateIndex
CREATE INDEX "districts_isActive_idx"
ON "districts"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "place_categories_slug_key"
ON "place_categories"("slug");

-- CreateIndex
CREATE INDEX "place_categories_name_idx"
ON "place_categories"("name");

-- CreateIndex
CREATE INDEX "place_categories_isActive_idx"
ON "place_categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "places_slug_key"
ON "places"("slug");

-- CreateIndex
CREATE INDEX "places_partnerId_idx"
ON "places"("partnerId");

-- CreateIndex
CREATE INDEX "places_partnerBranchId_idx"
ON "places"("partnerBranchId");

-- CreateIndex
CREATE INDEX "places_categoryId_idx"
ON "places"("categoryId");

-- CreateIndex
CREATE INDEX "places_provinceId_idx"
ON "places"("provinceId");

-- CreateIndex
CREATE INDEX "places_districtId_idx"
ON "places"("districtId");

-- CreateIndex
CREATE INDEX "places_createdByUserId_idx"
ON "places"("createdByUserId");

-- CreateIndex
CREATE INDEX "places_reviewedByUserId_idx"
ON "places"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "places_verificationStatus_idx"
ON "places"("verificationStatus");

-- CreateIndex
CREATE INDEX "places_isActive_idx"
ON "places"("isActive");

-- CreateIndex
CREATE INDEX "places_deletedAt_idx"
ON "places"("deletedAt");

-- AddForeignKey
ALTER TABLE "districts"
ADD CONSTRAINT "districts_provinceId_fkey"
FOREIGN KEY ("provinceId")
REFERENCES "provinces"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places"
ADD CONSTRAINT "places_partnerId_fkey"
FOREIGN KEY ("partnerId")
REFERENCES "partners"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places"
ADD CONSTRAINT "places_partnerBranchId_fkey"
FOREIGN KEY ("partnerBranchId")
REFERENCES "partner_branches"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places"
ADD CONSTRAINT "places_categoryId_fkey"
FOREIGN KEY ("categoryId")
REFERENCES "place_categories"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places"
ADD CONSTRAINT "places_provinceId_fkey"
FOREIGN KEY ("provinceId")
REFERENCES "provinces"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places"
ADD CONSTRAINT "places_districtId_fkey"
FOREIGN KEY ("districtId")
REFERENCES "districts"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places"
ADD CONSTRAINT "places_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places"
ADD CONSTRAINT "places_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Enable Row Level Security
ALTER TABLE "provinces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "districts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "place_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "places" ENABLE ROW LEVEL SECURITY;
