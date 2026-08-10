CREATE TABLE "PractitionerLocationAssignment" (
    "practitionerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PractitionerLocationAssignment_pkey" PRIMARY KEY ("practitionerId", "locationId")
);

CREATE INDEX "PractitionerLocationAssignment_locationId_practitionerId_idx"
ON "PractitionerLocationAssignment"("locationId", "practitionerId");

ALTER TABLE "PractitionerLocationAssignment"
ADD CONSTRAINT "PractitionerLocationAssignment_practitionerId_fkey"
FOREIGN KEY ("practitionerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PractitionerLocationAssignment"
ADD CONSTRAINT "PractitionerLocationAssignment_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "Location"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "PractitionerLocationAssignment" ("practitionerId", "locationId")
SELECT "id", "locationId"
FROM "User"
WHERE "locationId" IS NOT NULL;
