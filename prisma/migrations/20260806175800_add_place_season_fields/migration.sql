-- Add season metadata for tourism places.
ALTER TABLE "places"
  ADD COLUMN "bestVisitMonths" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "seasonNote" VARCHAR(255);
