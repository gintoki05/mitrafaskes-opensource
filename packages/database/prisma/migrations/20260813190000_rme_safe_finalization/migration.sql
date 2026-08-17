CREATE TYPE "AllergyReviewStatus" AS ENUM ('KNOWN', 'NONE_KNOWN', 'NOT_REVIEWED');
CREATE TYPE "OutpatientDisposition" AS ENUM ('HOME', 'REFERRED', 'ADMITTED', 'OTHER');

ALTER TABLE "MedicalRecord"
  ADD COLUMN "chiefComplaint" TEXT,
  ADD COLUMN "presentIllness" TEXT,
  ADD COLUMN "allergyReviewStatus" "AllergyReviewStatus",
  ADD COLUMN "allergyDetails" TEXT,
  ADD COLUMN "physicalExam" TEXT,
  ADD COLUMN "education" TEXT,
  ADD COLUMN "carePlan" TEXT,
  ADD COLUMN "disposition" "OutpatientDisposition";

-- Preserve legacy combined narratives without inventing new clinical values.
-- Clinicians can review and separate the two fields while the record is DRAFT.
UPDATE "MedicalRecord"
SET
  "chiefComplaint" = "anamnesis",
  "presentIllness" = "anamnesis"
WHERE "anamnesis" IS NOT NULL
  AND BTRIM("anamnesis") <> '';

CREATE TABLE "MedicalRecordAuditEvent" (
  "id" TEXT NOT NULL,
  "medicalRecordId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorUsername" VARCHAR(128) NOT NULL,
  "actorRole" "Role" NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "entityType" VARCHAR(64) NOT NULL,
  "entityId" TEXT NOT NULL,
  "entityVersion" INTEGER NOT NULL,
  "expectedVersion" INTEGER NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestId" VARCHAR(128) NOT NULL,
  "correlationId" VARCHAR(128) NOT NULL,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  CONSTRAINT "MedicalRecordAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MedicalRecordAuditEvent_idempotencyKey_key"
  ON "MedicalRecordAuditEvent"("idempotencyKey");
CREATE INDEX "MedicalRecordAuditEvent_entityType_entityId_occurredAt_idx"
  ON "MedicalRecordAuditEvent"("entityType", "entityId", "occurredAt");
CREATE INDEX "MedicalRecordAuditEvent_actorUserId_occurredAt_idx"
  ON "MedicalRecordAuditEvent"("actorUserId", "occurredAt");
CREATE INDEX "MedicalRecordAuditEvent_correlationId_idx"
  ON "MedicalRecordAuditEvent"("correlationId");

ALTER TABLE "MedicalRecordAuditEvent"
  ADD CONSTRAINT "MedicalRecordAuditEvent_medicalRecordId_fkey"
  FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
