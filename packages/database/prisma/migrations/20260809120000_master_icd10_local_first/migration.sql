-- Upgrade the existing ICD-10 fixture into a typed local-first terminology.
ALTER TABLE "MasterIcd10"
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "source" VARCHAR(64) NOT NULL DEFAULT 'LOCAL_SNAPSHOT',
  ADD COLUMN "sourceVersion" VARCHAR(128),
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "MasterIcd10_active_displayOrder_code_idx"
  ON "MasterIcd10"("active", "displayOrder", "code");

CREATE INDEX "MasterIcd10_active_nameIndo_idx"
  ON "MasterIcd10"("active", "nameIndo");
