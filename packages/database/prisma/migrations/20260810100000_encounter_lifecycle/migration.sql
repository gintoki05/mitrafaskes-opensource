-- PRI-14 makes Encounter authoritative in PostgreSQL. The previous runtime
-- used MemoryStore, so silently guessing a context for persisted legacy rows
-- would create incorrect clinical data.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Encounter") THEN
    RAISE EXCEPTION 'PRI-14 migration requires an explicit Encounter backfill before applying the new context fields';
  END IF;
END $$;

CREATE SEQUENCE "encounter_number_seq"
  AS BIGINT
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER TABLE "Encounter"
  ADD COLUMN "encounterNumber" VARCHAR(32),
  ADD COLUMN "organizationId" TEXT,
  ADD COLUMN "locationId" TEXT,
  ADD COLUMN "queueDate" DATE,
  ADD COLUMN "arrivedAt" TIMESTAMP(3),
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Encounter"
  DROP COLUMN "satusehatEncounterId";

ALTER TABLE "Encounter"
  ALTER COLUMN "encounterNumber" SET NOT NULL,
  ALTER COLUMN "organizationId" SET NOT NULL,
  ALTER COLUMN "locationId" SET NOT NULL,
  ALTER COLUMN "queueDate" SET NOT NULL,
  ALTER COLUMN "arrivedAt" SET NOT NULL;

CREATE UNIQUE INDEX "Encounter_encounterNumber_key"
  ON "Encounter"("encounterNumber");

CREATE UNIQUE INDEX "Encounter_locationId_queueDate_queueNumber_key"
  ON "Encounter"("locationId", "queueDate", "queueNumber");

CREATE INDEX "Encounter_queueDate_locationId_status_idx"
  ON "Encounter"("queueDate", "locationId", "status");

CREATE INDEX "Encounter_patientId_locationId_queueDate_status_idx"
  ON "Encounter"("patientId", "locationId", "queueDate", "status");

CREATE INDEX "Encounter_doctorId_queueDate_status_idx"
  ON "Encounter"("doctorId", "queueDate", "status");

CREATE UNIQUE INDEX "Encounter_active_patient_context_key"
  ON "Encounter"("patientId", "locationId", "queueDate")
  WHERE "status" IN ('WAITING', 'IN_PROGRESS');

CREATE TABLE "EncounterStatusHistory" (
  "id" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "status" "EncounterStatus" NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3),
  "actorUserId" TEXT,
  "actorUsername" VARCHAR(128) NOT NULL,
  "actorRole" "Role" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EncounterStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EncounterStatusHistory_encounterId_periodStart_idx"
  ON "EncounterStatusHistory"("encounterId", "periodStart");

CREATE INDEX "EncounterStatusHistory_actorUserId_createdAt_idx"
  ON "EncounterStatusHistory"("actorUserId", "createdAt");

CREATE TABLE "EncounterQueueCounter" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "queueDate" DATE NOT NULL,
  "lastIssuedNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EncounterQueueCounter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EncounterQueueCounter_locationId_queueDate_key"
  ON "EncounterQueueCounter"("locationId", "queueDate");

ALTER TABLE "Encounter"
  ADD CONSTRAINT "Encounter_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "HealthcareOrganization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Encounter_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EncounterStatusHistory"
  ADD CONSTRAINT "EncounterStatusHistory_encounterId_fkey"
  FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "EncounterStatusHistory_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EncounterQueueCounter"
  ADD CONSTRAINT "EncounterQueueCounter_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
