-- Align the local Encounter vocabulary with the canonical FHIR status codes.
ALTER TABLE "Encounter" ALTER COLUMN "status" DROP DEFAULT;
DROP INDEX IF EXISTS "Encounter_active_patient_context_key";

ALTER TYPE "EncounterStatus" RENAME TO "EncounterStatus_old";

CREATE TYPE "EncounterStatus" AS ENUM (
  'planned',
  'arrived',
  'triaged',
  'in-progress',
  'onleave',
  'finished',
  'cancelled',
  'entered-in-error',
  'unknown'
);

ALTER TABLE "Encounter"
  ALTER COLUMN "status" TYPE "EncounterStatus"
  USING (
    CASE "status"::text
      WHEN 'WAITING' THEN 'arrived'
      WHEN 'IN_PROGRESS' THEN 'in-progress'
      WHEN 'COMPLETED' THEN 'finished'
      WHEN 'CANCELLED' THEN 'cancelled'
      ELSE 'unknown'
    END
  )::"EncounterStatus";

ALTER TABLE "EncounterStatusHistory"
  ALTER COLUMN "status" TYPE "EncounterStatus"
  USING (
    CASE "status"::text
      WHEN 'WAITING' THEN 'arrived'
      WHEN 'IN_PROGRESS' THEN 'in-progress'
      WHEN 'COMPLETED' THEN 'finished'
      WHEN 'CANCELLED' THEN 'cancelled'
      ELSE 'unknown'
    END
  )::"EncounterStatus";

DROP TYPE "EncounterStatus_old";

ALTER TABLE "Encounter"
  ALTER COLUMN "status" SET DEFAULT 'arrived';

CREATE UNIQUE INDEX "Encounter_active_patient_context_key"
  ON "Encounter"("patientId", "locationId", "queueDate")
  WHERE "status" IN ('arrived', 'triaged', 'in-progress', 'onleave');

ALTER TABLE "EncounterStatusHistory"
  ADD COLUMN "reason" VARCHAR(500);

CREATE TYPE "IntegrationOutboxStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SUCCESS',
  'FAILED',
  'BLOCKED',
  'SKIPPED'
);

CREATE TYPE "IntegrationOutboxDispatchScope" AS ENUM (
  'ALL_ENABLED',
  'LINKED_ONLY'
);

CREATE TABLE "IntegrationOutboxEvent" (
  "id" TEXT NOT NULL,
  "resourceType" VARCHAR(64) NOT NULL,
  "resourceId" TEXT NOT NULL,
  "aggregateVersion" INTEGER NOT NULL,
  "operation" VARCHAR(32) NOT NULL,
  "dispatchScope" "IntegrationOutboxDispatchScope" NOT NULL DEFAULT 'ALL_ENABLED',
  "status" "IntegrationOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "errorMessage" VARCHAR(1000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationOutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationOutboxEvent_resourceType_resourceId_aggregateVersion_operation_key"
  ON "IntegrationOutboxEvent"("resourceType", "resourceId", "aggregateVersion", "operation");

CREATE INDEX "IntegrationOutboxEvent_status_nextAttemptAt_idx"
  ON "IntegrationOutboxEvent"("status", "nextAttemptAt");

CREATE INDEX "IntegrationOutboxEvent_resourceType_resourceId_createdAt_idx"
  ON "IntegrationOutboxEvent"("resourceType", "resourceId", "createdAt");

INSERT INTO "Permission" ("code", "label", "group", "description", "sensitive", "updatedAt")
VALUES
  ('queue.pause', 'Tunda sementara pemeriksaan', 'Antrean', 'Mengubah Encounter menjadi onleave atau melanjutkan pemeriksaan.', false, CURRENT_TIMESTAMP),
  ('encounter.correct', 'Koreksi Encounter salah input', 'Encounter', 'Menandai Encounter yang belum final sebagai entered-in-error dengan alasan wajib.', true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "label" = EXCLUDED."label",
  "group" = EXCLUDED."group",
  "description" = EXCLUDED."description",
  "sensitive" = EXCLUDED."sensitive",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "AccessRolePermission" ("roleId", "permissionCode")
SELECT 'access-role-admin', 'encounter.correct'
WHERE EXISTS (SELECT 1 FROM "AccessRole" WHERE "id" = 'access-role-admin')
  AND EXISTS (SELECT 1 FROM "Permission" WHERE "code" = 'encounter.correct')
  AND NOT EXISTS (
    SELECT 1 FROM "AccessRolePermission"
    WHERE "roleId" = 'access-role-admin' AND "permissionCode" = 'encounter.correct'
  );

INSERT INTO "AccessRolePermission" ("roleId", "permissionCode")
SELECT 'access-role-dokter', 'queue.pause'
WHERE EXISTS (SELECT 1 FROM "AccessRole" WHERE "id" = 'access-role-dokter')
  AND EXISTS (SELECT 1 FROM "Permission" WHERE "code" = 'queue.pause')
  AND NOT EXISTS (
    SELECT 1 FROM "AccessRolePermission"
    WHERE "roleId" = 'access-role-dokter' AND "permissionCode" = 'queue.pause'
  );
