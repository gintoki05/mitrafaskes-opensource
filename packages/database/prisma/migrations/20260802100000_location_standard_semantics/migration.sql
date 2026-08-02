-- PRI-32 adds the minimum local semantics needed to map physical locations
-- to FHIR/SATUSEHAT Location without making the local schema provider-specific.

CREATE TYPE "LocationStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'INACTIVE'
);

CREATE TYPE "LocationMode" AS ENUM (
    'INSTANCE',
    'KIND'
);

ALTER TABLE "Location"
  ADD COLUMN "status" "LocationStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "mode" "LocationMode" NOT NULL DEFAULT 'INSTANCE',
  ADD COLUMN "physicalTypeCode" VARCHAR(32),
  ADD COLUMN "addressText" VARCHAR(500),
  ADD COLUMN "city" VARCHAR(100),
  ADD COLUMN "postalCode" VARCHAR(16),
  ADD COLUMN "countryCode" VARCHAR(2) NOT NULL DEFAULT 'ID';

ALTER TABLE "Location"
  ADD CONSTRAINT "Location_countryCode_check"
  CHECK (char_length("countryCode") = 2 AND "countryCode" = upper("countryCode"));
