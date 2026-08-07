-- Practitioner metadata stays on the local User domain record.
-- SATUSEHAT identifiers remain in ExternalResourceLink.

ALTER TABLE "User"
  ADD COLUMN "nik" VARCHAR(16),
  ADD COLUMN "birthDate" DATE,
  ADD COLUMN "gender" "Gender",
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "User_nik_key" ON "User"("nik");
CREATE INDEX "User_role_active_fullName_idx"
  ON "User"("role", "active", "fullName");

ALTER TABLE "User"
  ADD CONSTRAINT "User_nik_check"
  CHECK ("nik" IS NULL OR "nik" ~ '^[0-9]{16}$');

CREATE INDEX "SatusehatSyncLog_resourceType_resourceId_updatedAt_idx"
  ON "SatusehatSyncLog"("resourceType", "resourceId", "updatedAt");
