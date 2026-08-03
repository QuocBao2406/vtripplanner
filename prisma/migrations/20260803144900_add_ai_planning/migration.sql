-- CreateEnum
CREATE TYPE "TripPlanGenerationStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripPlanAttemptStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripPlanVersionStatus" AS ENUM ('READY', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "trip_plan_generations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "requestedByUserId" UUID,
    "status" "TripPlanGenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "inputSchemaVersion" VARCHAR(50) NOT NULL,
    "safeInputSnapshot" JSONB NOT NULL,
    "inputHash" VARCHAR(64) NOT NULL,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_plan_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_plan_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "generationId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "model" VARCHAR(150) NOT NULL,
    "status" "TripPlanAttemptStatus" NOT NULL DEFAULT 'STARTED',
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "providerRequestId" VARCHAR(255),
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCost" DECIMAL(14,6),
    "costCurrency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "latencyMs" INTEGER,
    "finishReason" VARCHAR(100),
    "outputHash" VARCHAR(64),
    "validationData" JSONB,
    "errorCode" VARCHAR(100),
    "errorMessage" VARCHAR(1000),
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_plan_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_plan_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "generationId" UUID,
    "sourceAttemptId" UUID,
    "versionNumber" INTEGER NOT NULL,
    "status" "TripPlanVersionStatus" NOT NULL DEFAULT 'READY',
    "schemaVersion" VARCHAR(50) NOT NULL,
    "planData" JSONB NOT NULL,
    "summaryData" JSONB,
    "validationData" JSONB NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "totalActivities" INTEGER NOT NULL,
    "estimatedTotalCost" DECIMAL(14,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
    "activatedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_plan_generations_tripId_idx" ON "trip_plan_generations"("tripId");

-- CreateIndex
CREATE INDEX "trip_plan_generations_tripId_createdAt_idx" ON "trip_plan_generations"("tripId", "createdAt");

-- CreateIndex
CREATE INDEX "trip_plan_generations_requestedByUserId_idx" ON "trip_plan_generations"("requestedByUserId");

-- CreateIndex
CREATE INDEX "trip_plan_generations_status_idx" ON "trip_plan_generations"("status");

-- CreateIndex
CREATE INDEX "trip_plan_attempts_generationId_idx" ON "trip_plan_attempts"("generationId");

-- CreateIndex
CREATE INDEX "trip_plan_attempts_status_idx" ON "trip_plan_attempts"("status");

-- CreateIndex
CREATE INDEX "trip_plan_attempts_provider_model_idx" ON "trip_plan_attempts"("provider", "model");

-- CreateIndex
CREATE INDEX "trip_plan_attempts_providerRequestId_idx" ON "trip_plan_attempts"("providerRequestId");

-- CreateIndex
CREATE INDEX "trip_plan_attempts_createdAt_idx" ON "trip_plan_attempts"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "trip_plan_attempts_generationId_attemptNumber_key" ON "trip_plan_attempts"("generationId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "trip_plan_versions_generationId_key" ON "trip_plan_versions"("generationId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_plan_versions_sourceAttemptId_key" ON "trip_plan_versions"("sourceAttemptId");

-- CreateIndex
CREATE INDEX "trip_plan_versions_tripId_idx" ON "trip_plan_versions"("tripId");

-- CreateIndex
CREATE INDEX "trip_plan_versions_tripId_status_idx" ON "trip_plan_versions"("tripId", "status");

-- CreateIndex
CREATE INDEX "trip_plan_versions_status_idx" ON "trip_plan_versions"("status");

-- CreateIndex
CREATE INDEX "trip_plan_versions_createdAt_idx" ON "trip_plan_versions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "trip_plan_versions_tripId_versionNumber_key" ON "trip_plan_versions"("tripId", "versionNumber");

-- AddForeignKey
ALTER TABLE "trip_plan_generations" ADD CONSTRAINT "trip_plan_generations_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_plan_generations" ADD CONSTRAINT "trip_plan_generations_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_plan_attempts" ADD CONSTRAINT "trip_plan_attempts_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "trip_plan_generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_plan_versions" ADD CONSTRAINT "trip_plan_versions_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_plan_versions" ADD CONSTRAINT "trip_plan_versions_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "trip_plan_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_plan_versions" ADD CONSTRAINT "trip_plan_versions_sourceAttemptId_fkey" FOREIGN KEY ("sourceAttemptId") REFERENCES "trip_plan_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "trip_plan_generations"
ADD CONSTRAINT "trip_plan_generations_safe_input_snapshot_object_check"
CHECK (jsonb_typeof("safeInputSnapshot") = 'object');

-- AddCheckConstraint
ALTER TABLE "trip_plan_generations"
ADD CONSTRAINT "trip_plan_generations_input_hash_format_check"
CHECK ("inputHash" ~ '^[0-9A-Fa-f]{64}$');

-- AddCheckConstraint
ALTER TABLE "trip_plan_generations"
ADD CONSTRAINT "trip_plan_generations_completed_at_check"
CHECK ("completedAt" IS NULL OR "completedAt" >= "createdAt");

-- AddCheckConstraint
ALTER TABLE "trip_plan_attempts"
ADD CONSTRAINT "trip_plan_attempts_attempt_number_check"
CHECK ("attemptNumber" >= 1);

-- AddCheckConstraint
ALTER TABLE "trip_plan_attempts"
ADD CONSTRAINT "trip_plan_attempts_input_tokens_check"
CHECK ("inputTokens" IS NULL OR "inputTokens" >= 0);

-- AddCheckConstraint
ALTER TABLE "trip_plan_attempts"
ADD CONSTRAINT "trip_plan_attempts_output_tokens_check"
CHECK ("outputTokens" IS NULL OR "outputTokens" >= 0);

-- AddCheckConstraint
ALTER TABLE "trip_plan_attempts"
ADD CONSTRAINT "trip_plan_attempts_estimated_cost_check"
CHECK ("estimatedCost" IS NULL OR "estimatedCost" >= 0);

-- AddCheckConstraint
ALTER TABLE "trip_plan_attempts"
ADD CONSTRAINT "trip_plan_attempts_cost_currency_check"
CHECK ("costCurrency" ~ '^[A-Z]{3}$');

-- AddCheckConstraint
ALTER TABLE "trip_plan_attempts"
ADD CONSTRAINT "trip_plan_attempts_latency_ms_check"
CHECK ("latencyMs" IS NULL OR "latencyMs" >= 0);

-- AddCheckConstraint
ALTER TABLE "trip_plan_attempts"
ADD CONSTRAINT "trip_plan_attempts_output_hash_format_check"
CHECK ("outputHash" IS NULL OR "outputHash" ~ '^[0-9A-Fa-f]{64}$');

-- AddCheckConstraint
ALTER TABLE "trip_plan_attempts"
ADD CONSTRAINT "trip_plan_attempts_validation_data_object_check"
CHECK ("validationData" IS NULL OR jsonb_typeof("validationData") = 'object');

-- AddCheckConstraint
ALTER TABLE "trip_plan_attempts"
ADD CONSTRAINT "trip_plan_attempts_completed_at_check"
CHECK ("completedAt" IS NULL OR "completedAt" >= "startedAt");

-- AddCheckConstraint
ALTER TABLE "trip_plan_versions"
ADD CONSTRAINT "trip_plan_versions_version_number_check"
CHECK ("versionNumber" >= 1);

-- AddCheckConstraint
ALTER TABLE "trip_plan_versions"
ADD CONSTRAINT "trip_plan_versions_plan_data_object_check"
CHECK (jsonb_typeof("planData") = 'object');

-- AddCheckConstraint
ALTER TABLE "trip_plan_versions"
ADD CONSTRAINT "trip_plan_versions_summary_data_object_check"
CHECK ("summaryData" IS NULL OR jsonb_typeof("summaryData") = 'object');

-- AddCheckConstraint
ALTER TABLE "trip_plan_versions"
ADD CONSTRAINT "trip_plan_versions_validation_data_object_check"
CHECK (jsonb_typeof("validationData") = 'object');

-- AddCheckConstraint
ALTER TABLE "trip_plan_versions"
ADD CONSTRAINT "trip_plan_versions_total_days_check"
CHECK ("totalDays" >= 1);

-- AddCheckConstraint
ALTER TABLE "trip_plan_versions"
ADD CONSTRAINT "trip_plan_versions_total_activities_check"
CHECK ("totalActivities" >= 0);

-- AddCheckConstraint
ALTER TABLE "trip_plan_versions"
ADD CONSTRAINT "trip_plan_versions_estimated_total_cost_check"
CHECK ("estimatedTotalCost" IS NULL OR "estimatedTotalCost" >= 0);

-- AddCheckConstraint
ALTER TABLE "trip_plan_versions"
ADD CONSTRAINT "trip_plan_versions_currency_check"
CHECK ("currency" ~ '^[A-Z]{3}$');

-- AddPartialUniqueIndex
CREATE UNIQUE INDEX "trip_plan_versions_one_active_per_trip_key"
ON "trip_plan_versions"("tripId")
WHERE "status" = 'ACTIVE';

-- EnableRowLevelSecurity
ALTER TABLE "trip_plan_generations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_plan_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_plan_versions" ENABLE ROW LEVEL SECURITY;
