-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM (
    'MOTORBIKE',
    'PRIVATE_CAR',
    'TAXI_RIDE_HAILING',
    'BUS',
    'TRAIN',
    'AIRPLANE',
    'BOAT_FERRY',
    'BICYCLE',
    'WALKING',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM (
    'HOTEL',
    'RESORT',
    'HOMESTAY',
    'HOSTEL',
    'APARTMENT',
    'GUESTHOUSE',
    'CAMPING',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "TripConstraintType" AS ENUM (
    'MOBILITY',
    'ACCESSIBILITY',
    'DIETARY',
    'SCHEDULE',
    'TRANSPORT',
    'ACCOMMODATION',
    'SAFETY',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "ConstraintPriority" AS ENUM (
    'PREFERENCE',
    'IMPORTANT',
    'REQUIRED'
);

-- CreateEnum
CREATE TYPE "SavedPlacePriority" AS ENUM (
    'OPTIONAL',
    'PREFERRED',
    'REQUIRED'
);

-- CreateTable
CREATE TABLE "trip_transport_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "mainMode" "TransportMode",
    "localModes" "TransportMode"[] DEFAULT ARRAY[]::"TransportMode"[],
    "avoidModes" "TransportMode"[] DEFAULT ARRAY[]::"TransportMode"[],
    "privateVehicleCapacity" INTEGER,
    "maxTravelMinutesPerLeg" INTEGER,
    "requiresAccessibleTransport" BOOLEAN NOT NULL DEFAULT false,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_transport_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trip_transport_preferences_private_vehicle_capacity_check" CHECK ("privateVehicleCapacity" IS NULL OR "privateVehicleCapacity" >= 1),
    CONSTRAINT "trip_transport_preferences_max_travel_minutes_per_leg_check" CHECK ("maxTravelMinutesPerLeg" IS NULL OR "maxTravelMinutesPerLeg" >= 1),
    CONSTRAINT "trip_transport_preferences_main_mode_not_avoided_check" CHECK ("mainMode" IS NULL OR NOT ("mainMode" = ANY ("avoidModes"))),
    CONSTRAINT "trip_transport_preferences_local_modes_not_avoided_check" CHECK (NOT ("localModes" && "avoidModes"))
);

-- CreateTable
CREATE TABLE "trip_accommodation_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "preferredTypes" "AccommodationType"[] DEFAULT ARRAY[]::"AccommodationType"[],
    "roomCount" INTEGER,
    "maxNightlyBudget" DECIMAL(14,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
    "requiredAmenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredAmenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowsSharedRoom" BOOLEAN NOT NULL DEFAULT false,
    "maxDistanceFromCenterKm" DECIMAL(8,2),
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_accommodation_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trip_accommodation_preferences_room_count_check" CHECK ("roomCount" IS NULL OR "roomCount" >= 1),
    CONSTRAINT "trip_accommodation_preferences_max_nightly_budget_check" CHECK ("maxNightlyBudget" IS NULL OR "maxNightlyBudget" >= 0),
    CONSTRAINT "trip_accommodation_preferences_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
    CONSTRAINT "trip_accommodation_preferences_max_distance_from_center_km_check" CHECK ("maxDistanceFromCenterKm" IS NULL OR "maxDistanceFromCenterKm" >= 0)
);

-- CreateTable
CREATE TABLE "trip_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "pace" "TravelPace",
    "preferredStartTime" TIME(0),
    "preferredEndTime" TIME(0),
    "maxActivitiesPerDay" INTEGER,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avoidInterests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wantsLocalExperiences" BOOLEAN NOT NULL DEFAULT false,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trip_preferences_time_range_check" CHECK ("preferredStartTime" IS NULL OR "preferredEndTime" IS NULL OR "preferredEndTime" > "preferredStartTime"),
    CONSTRAINT "trip_preferences_max_activities_per_day_check" CHECK ("maxActivitiesPerDay" IS NULL OR "maxActivitiesPerDay" >= 1),
    CONSTRAINT "trip_preferences_interests_not_avoided_check" CHECK (NOT ("interests" && "avoidInterests"))
);

-- CreateTable
CREATE TABLE "trip_constraints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "participantId" UUID,
    "type" "TripConstraintType" NOT NULL,
    "priority" "ConstraintPriority" NOT NULL DEFAULT 'PREFERENCE',
    "title" VARCHAR(150) NOT NULL,
    "details" VARCHAR(1000),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_constraints_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trip_constraints_title_not_blank_check" CHECK (length(btrim("title")) > 0),
    CONSTRAINT "trip_constraints_sort_order_check" CHECK ("sortOrder" >= 0)
);

-- CreateTable
CREATE TABLE "trip_saved_places" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "priority" "SavedPlacePriority" NOT NULL DEFAULT 'OPTIONAL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_saved_places_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trip_saved_places_sort_order_check" CHECK ("sortOrder" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_transport_preferences_tripId_key"
    ON "trip_transport_preferences"("tripId");

-- CreateIndex
CREATE INDEX "trip_transport_preferences_mainMode_idx"
    ON "trip_transport_preferences"("mainMode");

-- CreateIndex
CREATE UNIQUE INDEX "trip_accommodation_preferences_tripId_key"
    ON "trip_accommodation_preferences"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_preferences_tripId_key"
    ON "trip_preferences"("tripId");

-- CreateIndex
CREATE INDEX "trip_preferences_pace_idx"
    ON "trip_preferences"("pace");

-- CreateIndex
CREATE INDEX "trip_constraints_tripId_idx"
    ON "trip_constraints"("tripId");

-- CreateIndex
CREATE INDEX "trip_constraints_tripId_sortOrder_idx"
    ON "trip_constraints"("tripId", "sortOrder");

-- CreateIndex
CREATE INDEX "trip_constraints_participantId_idx"
    ON "trip_constraints"("participantId");

-- CreateIndex
CREATE INDEX "trip_constraints_type_idx"
    ON "trip_constraints"("type");

-- CreateIndex
CREATE INDEX "trip_constraints_priority_idx"
    ON "trip_constraints"("priority");

-- CreateIndex
CREATE INDEX "trip_constraints_isActive_idx"
    ON "trip_constraints"("isActive");

-- CreateIndex
CREATE INDEX "trip_saved_places_tripId_idx"
    ON "trip_saved_places"("tripId");

-- CreateIndex
CREATE INDEX "trip_saved_places_tripId_priority_sortOrder_idx"
    ON "trip_saved_places"("tripId", "priority", "sortOrder");

-- CreateIndex
CREATE INDEX "trip_saved_places_placeId_idx"
    ON "trip_saved_places"("placeId");

-- CreateIndex
CREATE INDEX "trip_saved_places_priority_idx"
    ON "trip_saved_places"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "trip_saved_places_tripId_placeId_key"
    ON "trip_saved_places"("tripId", "placeId");

-- AddForeignKey
ALTER TABLE "trip_transport_preferences" ADD CONSTRAINT "trip_transport_preferences_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_accommodation_preferences" ADD CONSTRAINT "trip_accommodation_preferences_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_preferences" ADD CONSTRAINT "trip_preferences_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_constraints" ADD CONSTRAINT "trip_constraints_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_constraints" ADD CONSTRAINT "trip_constraints_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "trip_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_saved_places" ADD CONSTRAINT "trip_saved_places_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_saved_places" ADD CONSTRAINT "trip_saved_places_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EnableRowLevelSecurity
ALTER TABLE "trip_transport_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_accommodation_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_constraints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_saved_places" ENABLE ROW LEVEL SECURITY;