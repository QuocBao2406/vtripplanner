-- CreateEnum
CREATE TYPE "TripChecklistPhase" AS ENUM ('BEFORE_TRIP', 'DURING_TRIP', 'AFTER_TRIP');

-- CreateEnum
CREATE TYPE "TripChecklistSource" AS ENUM ('DEFAULT', 'AI', 'USER');

-- CreateEnum
CREATE TYPE "TripChecklistItemStatus" AS ENUM ('TODO', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "TripExpenseCategory" AS ENUM ('TRANSPORTATION', 'ACCOMMODATION', 'FOOD', 'TICKET', 'ACTIVITY', 'SHOPPING', 'HEALTH', 'EMERGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "TripExpenseScope" AS ENUM ('SHARED', 'PERSONAL');

-- CreateEnum
CREATE TYPE "TripExpenseSource" AS ENUM ('PLAN', 'USER');

-- CreateTable
CREATE TABLE "trip_checklists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "phase" "TripChecklistPhase" NOT NULL,
    "source" "TripChecklistSource" NOT NULL DEFAULT 'USER',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_checklist_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "checklistId" UUID NOT NULL,
    "assignedParticipantId" UUID,
    "title" VARCHAR(300) NOT NULL,
    "note" VARCHAR(1000),
    "status" "TripChecklistItemStatus" NOT NULL DEFAULT 'TODO',
    "dueAt" TIMESTAMPTZ(6),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_budgets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "plannedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "contingencyAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "tripDayId" UUID,
    "tripActivityId" UUID,
    "participantId" UUID,
    "title" VARCHAR(200) NOT NULL,
    "category" "TripExpenseCategory" NOT NULL,
    "scope" "TripExpenseScope" NOT NULL DEFAULT 'SHARED',
    "source" "TripExpenseSource" NOT NULL DEFAULT 'USER',
    "estimatedAmount" DECIMAL(14,2),
    "actualAmount" DECIMAL(14,2),
    "occurredAt" TIMESTAMPTZ(6),
    "note" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_checklists_tripId_idx" ON "trip_checklists"("tripId");

-- CreateIndex
CREATE INDEX "trip_checklists_tripId_phase_sortOrder_idx" ON "trip_checklists"("tripId", "phase", "sortOrder");

-- CreateIndex
CREATE INDEX "trip_checklist_items_checklistId_idx" ON "trip_checklist_items"("checklistId");

-- CreateIndex
CREATE INDEX "trip_checklist_items_assignedParticipantId_idx" ON "trip_checklist_items"("assignedParticipantId");

-- CreateIndex
CREATE INDEX "trip_checklist_items_checklistId_status_idx" ON "trip_checklist_items"("checklistId", "status");

-- CreateIndex
CREATE INDEX "trip_checklist_items_checklistId_sortOrder_idx" ON "trip_checklist_items"("checklistId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "trip_budgets_tripId_key" ON "trip_budgets"("tripId");

-- CreateIndex
CREATE INDEX "trip_expenses_tripId_idx" ON "trip_expenses"("tripId");

-- CreateIndex
CREATE INDEX "trip_expenses_tripDayId_idx" ON "trip_expenses"("tripDayId");

-- CreateIndex
CREATE INDEX "trip_expenses_tripActivityId_idx" ON "trip_expenses"("tripActivityId");

-- CreateIndex
CREATE INDEX "trip_expenses_participantId_idx" ON "trip_expenses"("participantId");

-- CreateIndex
CREATE INDEX "trip_expenses_tripId_category_idx" ON "trip_expenses"("tripId", "category");

-- CreateIndex
CREATE INDEX "trip_expenses_tripId_scope_idx" ON "trip_expenses"("tripId", "scope");

-- CreateIndex
CREATE INDEX "trip_expenses_tripId_source_idx" ON "trip_expenses"("tripId", "source");

-- CreateIndex
CREATE INDEX "trip_expenses_occurredAt_idx" ON "trip_expenses"("occurredAt");

-- AddForeignKey
ALTER TABLE "trip_checklists" ADD CONSTRAINT "trip_checklists_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_checklist_items" ADD CONSTRAINT "trip_checklist_items_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "trip_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_checklist_items" ADD CONSTRAINT "trip_checklist_items_assignedParticipantId_fkey" FOREIGN KEY ("assignedParticipantId") REFERENCES "trip_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_budgets" ADD CONSTRAINT "trip_budgets_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_tripDayId_fkey" FOREIGN KEY ("tripDayId") REFERENCES "trip_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_tripActivityId_fkey" FOREIGN KEY ("tripActivityId") REFERENCES "trip_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "trip_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add database-level validation constraints.
ALTER TABLE "trip_checklists"
ADD CONSTRAINT "trip_checklists_sort_order_nonnegative_check"
CHECK ("sortOrder" >= 0);

ALTER TABLE "trip_checklist_items"
ADD CONSTRAINT "trip_checklist_items_sort_order_nonnegative_check"
CHECK ("sortOrder" >= 0);

ALTER TABLE "trip_checklist_items"
ADD CONSTRAINT "trip_checklist_items_completion_state_check"
CHECK (
    (
        "status" = 'COMPLETED'
        AND "completedAt" IS NOT NULL
    )
    OR
    (
        "status" <> 'COMPLETED'
        AND "completedAt" IS NULL
    )
);

ALTER TABLE "trip_budgets"
ADD CONSTRAINT "trip_budgets_planned_amount_nonnegative_check"
CHECK ("plannedAmount" >= 0);

ALTER TABLE "trip_budgets"
ADD CONSTRAINT "trip_budgets_contingency_amount_nonnegative_check"
CHECK ("contingencyAmount" >= 0);

ALTER TABLE "trip_budgets"
ADD CONSTRAINT "trip_budgets_currency_format_check"
CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "trip_expenses"
ADD CONSTRAINT "trip_expenses_estimated_amount_nonnegative_check"
CHECK (
    "estimatedAmount" IS NULL
    OR "estimatedAmount" >= 0
);

ALTER TABLE "trip_expenses"
ADD CONSTRAINT "trip_expenses_actual_amount_nonnegative_check"
CHECK (
    "actualAmount" IS NULL
    OR "actualAmount" >= 0
);

ALTER TABLE "trip_expenses"
ADD CONSTRAINT "trip_expenses_amount_present_check"
CHECK (
    "estimatedAmount" IS NOT NULL
    OR "actualAmount" IS NOT NULL
);

ALTER TABLE "trip_expenses"
ADD CONSTRAINT "trip_expenses_scope_participant_check"
CHECK (
    (
        "scope" = 'PERSONAL'
        AND "participantId" IS NOT NULL
    )
    OR
    (
        "scope" = 'SHARED'
        AND "participantId" IS NULL
    )
);

-- Enable Row Level Security.
ALTER TABLE "trip_checklists"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "trip_checklist_items"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "trip_budgets"
ENABLE ROW LEVEL SECURITY;

ALTER TABLE "trip_expenses"
ENABLE ROW LEVEL SECURITY;
