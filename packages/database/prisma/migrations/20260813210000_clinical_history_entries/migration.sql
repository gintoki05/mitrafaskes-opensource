-- Structured optional clinical histories stay local to the MedicalRecord.
-- The free-text anamnesis column remains for compatibility with older drafts.
CREATE TABLE "ClinicalHistoryEntry" (
  "id" TEXT NOT NULL,
  "medicalRecordId" TEXT NOT NULL,
  "category" VARCHAR(32) NOT NULL,
  "text" TEXT NOT NULL,
  "status" VARCHAR(32),
  "onsetAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClinicalHistoryEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClinicalHistoryEntry_medicalRecordId_category_idx"
  ON "ClinicalHistoryEntry"("medicalRecordId", "category");
CREATE INDEX "ClinicalHistoryEntry_medicalRecordId_onsetAt_idx"
  ON "ClinicalHistoryEntry"("medicalRecordId", "onsetAt");

ALTER TABLE "ClinicalHistoryEntry"
  ADD CONSTRAINT "ClinicalHistoryEntry_medicalRecordId_fkey"
  FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
