ALTER TABLE "trips"
  ADD COLUMN "travelerCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "estimatedTransportCost" DECIMAL(14, 2),
  ADD COLUMN "estimatedAccommodationCost" DECIMAL(14, 2),
  ADD COLUMN "estimatedFoodCost" DECIMAL(14, 2),
  ADD COLUMN "estimatedActivityCost" DECIMAL(14, 2),
  ADD COLUMN "estimatedReserveAmount" DECIMAL(14, 2),
  ADD COLUMN "estimatedBudgetRemaining" DECIMAL(14, 2),
  ADD COLUMN "estimatedTotalCost" DECIMAL(14, 2);
