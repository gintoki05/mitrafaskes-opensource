ALTER TABLE "User"
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "locationId" TEXT;

CREATE INDEX "User_organizationId_active_fullName_idx"
ON "User"("organizationId", "active", "fullName");

CREATE INDEX "User_locationId_active_fullName_idx"
ON "User"("locationId", "active", "fullName");

ALTER TABLE "User"
ADD CONSTRAINT "User_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "HealthcareOrganization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User"
ADD CONSTRAINT "User_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "Location"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
