-- CreateEnum
CREATE TYPE "RoadsideVehicleType" AS ENUM ('MOTORBIKE', 'CAR', 'BOTH');

-- CreateTable
CREATE TABLE "roadside_assistance_contacts" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "vehicleType" "RoadsideVehicleType" NOT NULL,
    "areaName" VARCHAR(200) NOT NULL,
    "googleMapsUrl" VARCHAR(2048) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roadside_assistance_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "roadside_assistance_contacts_isActive_displayOrder_idx" ON "roadside_assistance_contacts"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "roadside_assistance_contacts_areaName_idx" ON "roadside_assistance_contacts"("areaName");

-- CreateIndex
CREATE INDEX "roadside_assistance_contacts_vehicleType_idx" ON "roadside_assistance_contacts"("vehicleType");

-- Add database-level UUID default.
ALTER TABLE "roadside_assistance_contacts"
ALTER COLUMN "id"
SET DEFAULT gen_random_uuid();

-- Add database-level validation constraints.
ALTER TABLE "roadside_assistance_contacts"
ADD CONSTRAINT "roadside_assistance_contacts_display_order_nonnegative_check"
CHECK ("displayOrder" >= 0);

ALTER TABLE "roadside_assistance_contacts"
ADD CONSTRAINT "roadside_assistance_contacts_name_nonblank_check"
CHECK (char_length(btrim("name")) > 0);

ALTER TABLE "roadside_assistance_contacts"
ADD CONSTRAINT "roadside_assistance_contacts_phone_nonblank_check"
CHECK (char_length(btrim("phone")) > 0);

ALTER TABLE "roadside_assistance_contacts"
ADD CONSTRAINT "roadside_assistance_contacts_area_name_nonblank_check"
CHECK (char_length(btrim("areaName")) > 0);

ALTER TABLE "roadside_assistance_contacts"
ADD CONSTRAINT "roadside_assistance_contacts_google_maps_url_check"
CHECK (
    "googleMapsUrl" ~* '^https://((www\.)?google\.[a-z.]+/maps(/|$)|maps\.google\.[a-z.]+(/|$)|maps\.app\.goo\.gl(/|$)|goo\.gl/maps(/|$))'
);

-- Enable Row Level Security.
ALTER TABLE "roadside_assistance_contacts"
ENABLE ROW LEVEL SECURITY;
