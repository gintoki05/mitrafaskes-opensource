-- Store the authoritative code-system display separately from optional local
-- Indonesian aliases. Existing fixture labels remain available during the
-- transition and are replaced by the canonical seed snapshot.
ALTER TABLE "MasterIcd10"
  ADD COLUMN "display" VARCHAR(255) NOT NULL DEFAULT '';

UPDATE "MasterIcd10"
SET "display" = COALESCE(NULLIF("nameEng", ''), "nameIndo");

ALTER TABLE "MasterIcd10"
  ALTER COLUMN "display" DROP DEFAULT,
  ALTER COLUMN "nameIndo" DROP NOT NULL;

CREATE INDEX "MasterIcd10_active_display_idx"
  ON "MasterIcd10"("active", "display");
