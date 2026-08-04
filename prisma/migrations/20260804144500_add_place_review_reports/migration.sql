-- CreateEnum
CREATE TYPE "PlaceReviewReportReason" AS ENUM (
    'SPAM',
    'ABUSIVE_OR_HARASSING',
    'HATE_OR_DISCRIMINATION',
    'INAPPROPRIATE_CONTENT',
    'MISLEADING_INFORMATION',
    'PRIVACY_VIOLATION',
    'CONFLICT_OF_INTEREST',
    'OTHER'
);

-- CreateEnum
CREATE TYPE "PlaceReviewReportStatus" AS ENUM (
    'PENDING',
    'IN_REVIEW',
    'RESOLVED',
    'DISMISSED'
);

-- CreateTable
CREATE TABLE "place_review_reports" (
    "id" UUID NOT NULL,
    "reporterUserId" UUID,
    "placeReviewId" UUID NOT NULL,
    "reason" "PlaceReviewReportReason" NOT NULL,
    "details" VARCHAR(1000),
    "status" "PlaceReviewReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" UUID,
    "resolutionNote" VARCHAR(1000),
    "reviewedAt" TIMESTAMPTZ(6),
    "resolvedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "place_review_reports_pkey"
        PRIMARY KEY ("id"),

    CONSTRAINT "place_review_reports_details_nonblank_check"
        CHECK (
            "details" IS NULL
            OR char_length(btrim("details")) > 0
        ),

    CONSTRAINT "place_review_reports_resolution_note_nonblank_check"
        CHECK (
            "resolutionNote" IS NULL
            OR char_length(btrim("resolutionNote")) > 0
        ),

    CONSTRAINT "place_review_reports_other_requires_details_check"
        CHECK (
            "reason" <> 'OTHER'
            OR (
                "details" IS NOT NULL
                AND char_length(btrim("details")) > 0
            )
        ),

    CONSTRAINT "place_review_reports_status_state_check"
        CHECK (
            (
                "status" = 'PENDING'
                AND "reviewedByUserId" IS NULL
                AND "reviewedAt" IS NULL
                AND "resolvedAt" IS NULL
                AND "resolutionNote" IS NULL
            )
            OR
            (
                "status" = 'IN_REVIEW'
                AND "reviewedByUserId" IS NOT NULL
                AND "reviewedAt" IS NOT NULL
                AND "resolvedAt" IS NULL
                AND "resolutionNote" IS NULL
            )
            OR
            (
                "status" IN ('RESOLVED', 'DISMISSED')
                AND "reviewedByUserId" IS NOT NULL
                AND "reviewedAt" IS NOT NULL
                AND "resolvedAt" IS NOT NULL
                AND "resolutionNote" IS NOT NULL
                AND char_length(btrim("resolutionNote")) > 0
            )
        ),

    CONSTRAINT "place_review_reports_reviewed_at_order_check"
        CHECK (
            "reviewedAt" IS NULL
            OR "reviewedAt" >= "createdAt"
        ),

    CONSTRAINT "place_review_reports_resolved_at_order_check"
        CHECK (
            "resolvedAt" IS NULL
            OR (
                "reviewedAt" IS NOT NULL
                AND "resolvedAt" >= "reviewedAt"
            )
        )
);

-- CreateIndex
CREATE INDEX
    "place_review_reports_placeReviewId_status_createdAt_idx"
ON "place_review_reports"(
    "placeReviewId",
    "status",
    "createdAt"
);

-- CreateIndex
CREATE INDEX
    "place_review_reports_reporterUserId_createdAt_idx"
ON "place_review_reports"(
    "reporterUserId",
    "createdAt"
);

-- CreateIndex
CREATE INDEX
    "place_review_reports_status_createdAt_idx"
ON "place_review_reports"(
    "status",
    "createdAt"
);

-- CreateIndex
CREATE INDEX
    "place_review_reports_reviewedByUserId_status_idx"
ON "place_review_reports"(
    "reviewedByUserId",
    "status"
);

-- CreateIndex
CREATE UNIQUE INDEX
    "place_review_reports_reporterUserId_placeReviewId_key"
ON "place_review_reports"(
    "reporterUserId",
    "placeReviewId"
);

-- AddForeignKey
ALTER TABLE "place_review_reports"
ADD CONSTRAINT "place_review_reports_reporterUserId_fkey"
FOREIGN KEY ("reporterUserId")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_review_reports"
ADD CONSTRAINT "place_review_reports_placeReviewId_fkey"
FOREIGN KEY ("placeReviewId")
REFERENCES "place_reviews"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_review_reports"
ADD CONSTRAINT "place_review_reports_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId")
REFERENCES "users"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- EnableRowLevelSecurity
ALTER TABLE "place_review_reports"
ENABLE ROW LEVEL SECURITY;
