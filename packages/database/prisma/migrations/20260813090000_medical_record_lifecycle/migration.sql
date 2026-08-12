CREATE TYPE "MedicalRecordStatus" AS ENUM ('DRAFT', 'FINAL');

ALTER TABLE "MedicalRecord"
  ADD COLUMN "status" "MedicalRecordStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "authoredBy" VARCHAR(128),
  ADD COLUMN "authoredAt" TIMESTAMP(3),
  ADD COLUMN "finalizedBy" VARCHAR(128),
  ADD COLUMN "finalizedAt" TIMESTAMP(3),
  ADD COLUMN "validationProfile" VARCHAR(64) NOT NULL DEFAULT 'OUTPATIENT_GENERAL_V1';

UPDATE "MedicalRecord"
SET "authoredAt" = "createdAt";

-- Existing records on completed Encounters were written by the legacy
-- endpoint that finalized both at once. Preserve that meaning instead of
-- reopening them as drafts.
UPDATE "MedicalRecord" AS record
SET
  "status" = 'FINAL',
  "finalizedAt" = record."updatedAt"
FROM "Encounter" AS encounter
WHERE encounter."id" = record."encounterId"
  AND encounter."status" = 'COMPLETED';
