-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM (
  'DRAFT',
  'PLANNING',
  'READY',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED'
);

-- CreateEnum
CREATE TYPE "ParticipantAgeGroup" AS ENUM (
  'ADULT',
  'CHILD',
  'INFANT',
  'SENIOR'
);

-- CreateEnum
CREATE TYPE "TripActivityType" AS ENUM (
  'TRANSPORT',
  'VISIT',
  'MEAL',
  'ACCOMMODATION',
  'REST',
  'FREE_TIME',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "TripPriceCategory" AS ENUM (
  'TRANSPORT',
  'ACCOMMODATION',
  'FOOD',
  'TICKET',
  'ACTIVITY',
  'OTHER'
);

-- CreateTable
CREATE TABLE "trips" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ownerUserId" UUID NOT NULL,
  "destinationProvinceId" UUID,
  "destinationDistrictId" UUID,
  "title" VARCHAR(200) NOT NULL DEFAULT 'Chuyến đi mới',
  "originName" VARCHAR(255),
  "originLatitude" DECIMAL(9, 6),
  "originLongitude" DECIMAL(10, 6),
  "startDate" DATE,
  "endDate" DATE,
  "totalBudget" DECIMAL(14, 2),
  "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
  "currentStep" INTEGER NOT NULL DEFAULT 1,
  "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" VARCHAR(2000),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  "deletedAt" TIMESTAMPTZ(6),

  CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_participants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "displayName" VARCHAR(150) NOT NULL,
  "ageGroup" "ParticipantAgeGroup" NOT NULL DEFAULT 'ADULT',
  "ageAtTrip" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "notes" VARCHAR(500),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "trip_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_days" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripId" UUID NOT NULL,
  "dayNumber" INTEGER NOT NULL,
  "date" DATE NOT NULL,
  "title" VARCHAR(200),
  "notes" VARCHAR(1000),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "trip_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_activities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tripDayId" UUID NOT NULL,
  "placeId" UUID,
  "type" "TripActivityType" NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" VARCHAR(2000),
  "startsAt" TIMESTAMPTZ(6) NOT NULL,
  "endsAt" TIMESTAMPTZ(6) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "notes" VARCHAR(1000),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "trip_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_participant_prices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "participantId" UUID NOT NULL,
  "category" "TripPriceCategory" NOT NULL,
  "label" VARCHAR(150) NOT NULL,
  "amount" DECIMAL(14, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "notes" VARCHAR(1000),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "trip_participant_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trips_ownerUserId_idx"
ON "trips"("ownerUserId");

-- CreateIndex
CREATE INDEX "trips_destinationProvinceId_idx"
ON "trips"("destinationProvinceId");

-- CreateIndex
CREATE INDEX "trips_destinationDistrictId_idx"
ON "trips"("destinationDistrictId");

-- CreateIndex
CREATE INDEX "trips_status_idx"
ON "trips"("status");

-- CreateIndex
CREATE INDEX "trips_startDate_endDate_idx"
ON "trips"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "trips_deletedAt_idx"
ON "trips"("deletedAt");

-- CreateIndex
CREATE INDEX "trip_participants_tripId_idx"
ON "trip_participants"("tripId");

-- CreateIndex
CREATE INDEX "trip_participants_tripId_sortOrder_idx"
ON "trip_participants"("tripId", "sortOrder");

-- CreateIndex
CREATE INDEX "trip_participants_ageGroup_idx"
ON "trip_participants"("ageGroup");

-- CreateIndex
CREATE UNIQUE INDEX "trip_days_tripId_dayNumber_key"
ON "trip_days"("tripId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "trip_days_tripId_date_key"
ON "trip_days"("tripId", "date");

-- CreateIndex
CREATE INDEX "trip_days_tripId_idx"
ON "trip_days"("tripId");

-- CreateIndex
CREATE INDEX "trip_days_date_idx"
ON "trip_days"("date");

-- CreateIndex
CREATE INDEX "trip_activities_tripDayId_idx"
ON "trip_activities"("tripDayId");

-- CreateIndex
CREATE INDEX "trip_activities_tripDayId_sortOrder_idx"
ON "trip_activities"("tripDayId", "sortOrder");

-- CreateIndex
CREATE INDEX "trip_activities_placeId_idx"
ON "trip_activities"("placeId");

-- CreateIndex
CREATE INDEX "trip_activities_type_idx"
ON "trip_activities"("type");

-- CreateIndex
CREATE INDEX "trip_activities_startsAt_idx"
ON "trip_activities"("startsAt");

-- CreateIndex
CREATE INDEX "trip_participant_prices_participantId_idx"
ON "trip_participant_prices"("participantId");

-- CreateIndex
CREATE INDEX "trip_participant_prices_participantId_sortOrder_idx"
ON "trip_participant_prices"("participantId", "sortOrder");

-- CreateIndex
CREATE INDEX "trip_participant_prices_category_idx"
ON "trip_participant_prices"("category");

-- AddForeignKey
ALTER TABLE "trips"
ADD CONSTRAINT "trips_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips"
ADD CONSTRAINT "trips_destinationProvinceId_fkey"
FOREIGN KEY ("destinationProvinceId")
REFERENCES "provinces"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips"
ADD CONSTRAINT "trips_destinationDistrictId_fkey"
FOREIGN KEY ("destinationDistrictId")
REFERENCES "districts"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_participants"
ADD CONSTRAINT "trip_participants_tripId_fkey"
FOREIGN KEY ("tripId")
REFERENCES "trips"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_days"
ADD CONSTRAINT "trip_days_tripId_fkey"
FOREIGN KEY ("tripId")
REFERENCES "trips"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_activities"
ADD CONSTRAINT "trip_activities_tripDayId_fkey"
FOREIGN KEY ("tripDayId")
REFERENCES "trip_days"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_activities"
ADD CONSTRAINT "trip_activities_placeId_fkey"
FOREIGN KEY ("placeId")
REFERENCES "places"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_participant_prices"
ADD CONSTRAINT "trip_participant_prices_participantId_fkey"
FOREIGN KEY ("participantId")
REFERENCES "trip_participants"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Trip validation
ALTER TABLE "trips"
ADD CONSTRAINT "trips_title_not_blank_check"
CHECK (char_length(btrim("title")) > 0);

ALTER TABLE "trips"
ADD CONSTRAINT "trips_coordinates_pair_check"
CHECK (
  (
    "originLatitude" IS NULL
    AND "originLongitude" IS NULL
  )
  OR
  (
    "originLatitude" IS NOT NULL
    AND "originLongitude" IS NOT NULL
  )
);

ALTER TABLE "trips"
ADD CONSTRAINT "trips_originLatitude_range_check"
CHECK (
  "originLatitude" IS NULL
  OR (
    "originLatitude" >= -90
    AND "originLatitude" <= 90
  )
);

ALTER TABLE "trips"
ADD CONSTRAINT "trips_originLongitude_range_check"
CHECK (
  "originLongitude" IS NULL
  OR (
    "originLongitude" >= -180
    AND "originLongitude" <= 180
  )
);

ALTER TABLE "trips"
ADD CONSTRAINT "trips_date_range_check"
CHECK (
  "startDate" IS NULL
  OR "endDate" IS NULL
  OR "endDate" >= "startDate"
);

ALTER TABLE "trips"
ADD CONSTRAINT "trips_totalBudget_non_negative_check"
CHECK (
  "totalBudget" IS NULL
  OR "totalBudget" >= 0
);

ALTER TABLE "trips"
ADD CONSTRAINT "trips_currency_format_check"
CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "trips"
ADD CONSTRAINT "trips_currentStep_range_check"
CHECK (
  "currentStep" >= 1
  AND "currentStep" <= 12
);

-- Participant validation
ALTER TABLE "trip_participants"
ADD CONSTRAINT "trip_participants_displayName_not_blank_check"
CHECK (char_length(btrim("displayName")) > 0);

ALTER TABLE "trip_participants"
ADD CONSTRAINT "trip_participants_ageAtTrip_range_check"
CHECK (
  "ageAtTrip" IS NULL
  OR (
    "ageAtTrip" >= 0
    AND "ageAtTrip" <= 130
  )
);

ALTER TABLE "trip_participants"
ADD CONSTRAINT "trip_participants_sortOrder_non_negative_check"
CHECK ("sortOrder" >= 0);

-- Trip-day validation
ALTER TABLE "trip_days"
ADD CONSTRAINT "trip_days_dayNumber_positive_check"
CHECK ("dayNumber" >= 1);

-- Activity validation
ALTER TABLE "trip_activities"
ADD CONSTRAINT "trip_activities_title_not_blank_check"
CHECK (char_length(btrim("title")) > 0);

ALTER TABLE "trip_activities"
ADD CONSTRAINT "trip_activities_time_range_check"
CHECK ("endsAt" > "startsAt");

ALTER TABLE "trip_activities"
ADD CONSTRAINT "trip_activities_sortOrder_non_negative_check"
CHECK ("sortOrder" >= 0);

-- Participant-price validation
ALTER TABLE "trip_participant_prices"
ADD CONSTRAINT "trip_participant_prices_label_not_blank_check"
CHECK (char_length(btrim("label")) > 0);

ALTER TABLE "trip_participant_prices"
ADD CONSTRAINT "trip_participant_prices_amount_non_negative_check"
CHECK ("amount" >= 0);

ALTER TABLE "trip_participant_prices"
ADD CONSTRAINT "trip_participant_prices_currency_format_check"
CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "trip_participant_prices"
ADD CONSTRAINT "trip_participant_prices_sortOrder_non_negative_check"
CHECK ("sortOrder" >= 0);

-- Enable Row Level Security
ALTER TABLE "trips"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "trip_participants"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "trip_days"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "trip_activities"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "trip_participant_prices"
ENABLE ROW LEVEL SECURITY;
