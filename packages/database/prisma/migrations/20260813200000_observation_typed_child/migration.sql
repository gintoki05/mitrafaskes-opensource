-- Observation is a typed child of MedicalRecord. Legacy vital columns remain
-- for read compatibility while new drafts also persist this structured source.
CREATE TABLE "ClinicalObservation" (
  "id" TEXT NOT NULL,
  "medicalRecordId" TEXT NOT NULL,
  "category" VARCHAR(64) NOT NULL,
  "codeSystem" VARCHAR(255),
  "code" VARCHAR(128) NOT NULL,
  "codeDisplay" VARCHAR(255),
  "valueType" VARCHAR(32) NOT NULL,
  "valueQuantityValue" DOUBLE PRECISION,
  "valueQuantityUnit" VARCHAR(64),
  "valueQuantitySystem" VARCHAR(255),
  "valueQuantityCode" VARCHAR(64),
  "valueCodeSystem" VARCHAR(255),
  "valueCode" VARCHAR(128),
  "valueCodeDisplay" VARCHAR(255),
  "valueBoolean" BOOLEAN,
  "valueString" TEXT,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "performerId" TEXT,
  "status" VARCHAR(32) NOT NULL DEFAULT 'final',
  "provenance" VARCHAR(32) NOT NULL DEFAULT 'original',
  "derivedFromObservationIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "referenceRangeLow" DOUBLE PRECISION,
  "referenceRangeHigh" DOUBLE PRECISION,
  "interpretationCode" VARCHAR(128),
  "interpretationDisplay" VARCHAR(255),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClinicalObservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClinicalObservation_medicalRecordId_effectiveAt_idx"
  ON "ClinicalObservation"("medicalRecordId", "effectiveAt");
CREATE INDEX "ClinicalObservation_medicalRecordId_code_idx"
  ON "ClinicalObservation"("medicalRecordId", "code");
CREATE INDEX "ClinicalObservation_codeSystem_code_idx"
  ON "ClinicalObservation"("codeSystem", "code");
CREATE INDEX "ClinicalObservation_performerId_idx"
  ON "ClinicalObservation"("performerId");

ALTER TABLE "ClinicalObservation"
  ADD CONSTRAINT "ClinicalObservation_medicalRecordId_fkey"
  FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ClinicalObservation_performerId_fkey"
  FOREIGN KEY ("performerId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
