ALTER TABLE "trips"
  ADD COLUMN "destinationName" VARCHAR(255),
  ADD COLUMN "departureAt" TIMESTAMPTZ(6),
  ADD COLUMN "estimatedArrivalAt" TIMESTAMPTZ(6),
  ADD COLUMN "estimatedTravelDistanceKm" DECIMAL(10, 2),
  ADD COLUMN "estimatedTravelDurationMinutes" INTEGER,
  ADD COLUMN "travelEstimateSource" VARCHAR(40),
  ADD COLUMN "travelEstimateConfidence" VARCHAR(20);
