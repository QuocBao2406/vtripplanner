-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM (
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
);

-- CreateEnum
CREATE TYPE "PlacePriceAudience" AS ENUM (
  'GENERAL',
  'ADULT',
  'CHILD',
  'INFANT',
  'SENIOR',
  'STUDENT',
  'GROUP',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "PlacePriceUnit" AS ENUM (
  'PERSON',
  'ENTRY',
  'HOUR',
  'DAY',
  'NIGHT',
  'ROOM',
  'VEHICLE',
  'TABLE',
  'PACKAGE',
  'OTHER'
);

-- CreateTable
CREATE TABLE "place_images" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "placeId" UUID NOT NULL,
  "storagePath" VARCHAR(1024) NOT NULL,
  "altText" VARCHAR(255),
  "caption" VARCHAR(500),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isCover" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "place_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_opening_hours" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "placeId" UUID NOT NULL,
  "dayOfWeek" "DayOfWeek" NOT NULL,
  "periodOrder" INTEGER NOT NULL DEFAULT 1,
  "openTime" TIME(0),
  "closeTime" TIME(0),
  "closesNextDay" BOOLEAN NOT NULL DEFAULT false,
  "isClosed" BOOLEAN NOT NULL DEFAULT false,
  "isOpen24Hours" BOOLEAN NOT NULL DEFAULT false,
  "note" VARCHAR(500),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "place_opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_prices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "placeId" UUID NOT NULL,
  "label" VARCHAR(150) NOT NULL,
  "audience" "PlacePriceAudience" NOT NULL DEFAULT 'GENERAL',
  "unit" "PlacePriceUnit" NOT NULL,
  "amount" DECIMAL(14, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
  "minimumQuantity" INTEGER,
  "maximumQuantity" INTEGER,
  "validFrom" DATE,
  "validUntil" DATE,
  "note" VARCHAR(1000),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "place_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "place_images_placeId_sortOrder_idx"
ON "place_images"("placeId", "sortOrder");

-- CreateIndex
CREATE INDEX "place_images_placeId_isCover_idx"
ON "place_images"("placeId", "isCover");

-- Only one cover image is allowed for each place.
CREATE UNIQUE INDEX "place_images_one_cover_per_place_key"
ON "place_images"("placeId")
WHERE "isCover" = true;

-- CreateIndex
CREATE UNIQUE INDEX "place_opening_hours_placeId_dayOfWeek_periodOrder_key"
ON "place_opening_hours"(
  "placeId",
  "dayOfWeek",
  "periodOrder"
);

-- CreateIndex
CREATE INDEX "place_opening_hours_placeId_idx"
ON "place_opening_hours"("placeId");

-- CreateIndex
CREATE INDEX "place_opening_hours_dayOfWeek_idx"
ON "place_opening_hours"("dayOfWeek");

-- CreateIndex
CREATE INDEX "place_prices_placeId_idx"
ON "place_prices"("placeId");

-- CreateIndex
CREATE INDEX "place_prices_placeId_isActive_idx"
ON "place_prices"("placeId", "isActive");

-- CreateIndex
CREATE INDEX "place_prices_audience_idx"
ON "place_prices"("audience");

-- CreateIndex
CREATE INDEX "place_prices_validFrom_validUntil_idx"
ON "place_prices"("validFrom", "validUntil");

-- AddForeignKey
ALTER TABLE "place_images"
ADD CONSTRAINT "place_images_placeId_fkey"
FOREIGN KEY ("placeId")
REFERENCES "places"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_opening_hours"
ADD CONSTRAINT "place_opening_hours_placeId_fkey"
FOREIGN KEY ("placeId")
REFERENCES "places"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_prices"
ADD CONSTRAINT "place_prices_placeId_fkey"
FOREIGN KEY ("placeId")
REFERENCES "places"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Image validation
ALTER TABLE "place_images"
ADD CONSTRAINT "place_images_storagePath_not_blank_check"
CHECK (char_length(btrim("storagePath")) > 0);

ALTER TABLE "place_images"
ADD CONSTRAINT "place_images_sortOrder_non_negative_check"
CHECK ("sortOrder" >= 0);

-- Opening-hour validation
ALTER TABLE "place_opening_hours"
ADD CONSTRAINT "place_opening_hours_periodOrder_positive_check"
CHECK ("periodOrder" >= 1);

ALTER TABLE "place_opening_hours"
ADD CONSTRAINT "place_opening_hours_status_check"
CHECK (
  NOT ("isClosed" AND "isOpen24Hours")
);

ALTER TABLE "place_opening_hours"
ADD CONSTRAINT "place_opening_hours_time_mode_check"
CHECK (
  (
    "isClosed" = true
    AND "isOpen24Hours" = false
    AND "openTime" IS NULL
    AND "closeTime" IS NULL
    AND "closesNextDay" = false
  )
  OR
  (
    "isClosed" = false
    AND "isOpen24Hours" = true
    AND "openTime" IS NULL
    AND "closeTime" IS NULL
    AND "closesNextDay" = false
  )
  OR
  (
    "isClosed" = false
    AND "isOpen24Hours" = false
    AND "openTime" IS NOT NULL
    AND "closeTime" IS NOT NULL
    AND "openTime" <> "closeTime"
  )
);

-- Price validation
ALTER TABLE "place_prices"
ADD CONSTRAINT "place_prices_label_not_blank_check"
CHECK (char_length(btrim("label")) > 0);

ALTER TABLE "place_prices"
ADD CONSTRAINT "place_prices_amount_non_negative_check"
CHECK ("amount" >= 0);

ALTER TABLE "place_prices"
ADD CONSTRAINT "place_prices_currency_format_check"
CHECK (
  char_length("currency") = 3
  AND "currency" = upper("currency")
);

ALTER TABLE "place_prices"
ADD CONSTRAINT "place_prices_minimumQuantity_positive_check"
CHECK (
  "minimumQuantity" IS NULL
  OR "minimumQuantity" > 0
);

ALTER TABLE "place_prices"
ADD CONSTRAINT "place_prices_maximumQuantity_positive_check"
CHECK (
  "maximumQuantity" IS NULL
  OR "maximumQuantity" > 0
);

ALTER TABLE "place_prices"
ADD CONSTRAINT "place_prices_quantity_range_check"
CHECK (
  "minimumQuantity" IS NULL
  OR "maximumQuantity" IS NULL
  OR "maximumQuantity" >= "minimumQuantity"
);

ALTER TABLE "place_prices"
ADD CONSTRAINT "place_prices_validity_range_check"
CHECK (
  "validFrom" IS NULL
  OR "validUntil" IS NULL
  OR "validUntil" >= "validFrom"
);

-- Enable Row Level Security
ALTER TABLE "place_images"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "place_opening_hours"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "place_prices"
ENABLE ROW LEVEL SECURITY;
