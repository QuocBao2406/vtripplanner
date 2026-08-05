-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM (
    'SYSTEM',
    'TRIP',
    'PLACE',
    'REVIEW',
    'REPORT',
    'PARTNER',
    'SECURITY',
    'VOUCHER',
    'SOCIAL'
);

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipientUserId" UUID NOT NULL,
    "actorUserId" UUID,
    "category" "NotificationCategory" NOT NULL,
    "eventKey" VARCHAR(100) NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "title" VARCHAR(200) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "actionUrl" VARCHAR(2048),
    "metadata" JSONB,
    "deduplicationKey" VARCHAR(255),
    "readAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_recipientUserId_readAt_createdAt_idx"
ON "notifications"("recipientUserId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_recipientUserId_category_createdAt_idx"
ON "notifications"("recipientUserId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_expiresAt_idx"
ON "notifications"("expiresAt");

-- CreateIndex
CREATE INDEX "notifications_actorUserId_createdAt_idx"
ON "notifications"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_recipientUserId_deduplicationKey_key"
ON "notifications"("recipientUserId", "deduplicationKey");

-- AddForeignKey
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_recipientUserId_fkey"
FOREIGN KEY ("recipientUserId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_actorUserId_fkey"
FOREIGN KEY ("actorUserId")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_title_not_blank_check"
CHECK (btrim("title") <> '');

-- AddCheckConstraint
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_message_not_blank_check"
CHECK (btrim("message") <> '');

-- AddCheckConstraint
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_event_key_format_check"
CHECK (
    "eventKey" ~ '^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$'
);

-- AddCheckConstraint
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_action_url_internal_check"
CHECK (
    "actionUrl" IS NULL
    OR (
        btrim("actionUrl") <> ''
        AND "actionUrl" LIKE '/%'
        AND "actionUrl" NOT LIKE '//%'
    )
);

-- AddCheckConstraint
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_deduplication_key_not_blank_check"
CHECK (
    "deduplicationKey" IS NULL
    OR btrim("deduplicationKey") <> ''
);

-- AddCheckConstraint
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_metadata_object_check"
CHECK (
    "metadata" IS NULL
    OR jsonb_typeof("metadata") = 'object'
);

-- AddCheckConstraint
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_read_at_valid_check"
CHECK (
    "readAt" IS NULL
    OR "readAt" >= "createdAt"
);

-- AddCheckConstraint
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_expires_at_valid_check"
CHECK (
    "expiresAt" IS NULL
    OR "expiresAt" > "createdAt"
);

-- EnableRowLevelSecurity
ALTER TABLE "notifications"
ENABLE ROW LEVEL SECURITY;
