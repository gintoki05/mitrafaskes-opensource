-- Location/Ruangan is the single local resource for physical service places.
-- Remove the redundant ServiceUnit master and its optional Location relation.

ALTER TABLE "Location" DROP CONSTRAINT IF EXISTS "Location_serviceUnitId_fkey";
DROP INDEX IF EXISTS "Location_serviceUnitId_idx";
ALTER TABLE "Location" DROP COLUMN IF EXISTS "serviceUnitId";
DROP TABLE IF EXISTS "ServiceUnit";
DROP TYPE IF EXISTS "ServiceUnitType";
