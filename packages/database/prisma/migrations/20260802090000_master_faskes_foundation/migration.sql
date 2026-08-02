-- PRI-32 establishes the platform-agnostic local hierarchy used by
-- SATUSEHAT adapters later: organization/facility -> service unit -> location.

CREATE TYPE "OrganizationType" AS ENUM (
    'HEALTHCARE_FACILITY',
    'SUB_ORGANIZATION'
);

CREATE TYPE "ServiceUnitType" AS ENUM (
    'POLYCLINIC',
    'DEPARTMENT',
    'SUPPORT',
    'OTHER'
);

CREATE TYPE "LocationType" AS ENUM (
    'BUILDING',
    'FLOOR',
    'ROOM',
    'OTHER'
);

CREATE TABLE "HealthcareOrganization" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "OrganizationType" NOT NULL DEFAULT 'HEALTHCARE_FACILITY',
    "parentId" TEXT,
    "addressText" VARCHAR(500),
    "phone" VARCHAR(32),
    "email" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthcareOrganization_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HealthcareOrganization_code_check" CHECK (char_length(btrim("code")) BETWEEN 1 AND 64),
    CONSTRAINT "HealthcareOrganization_name_check" CHECK (char_length(btrim("name")) BETWEEN 2 AND 150),
    CONSTRAINT "HealthcareOrganization_email_check" CHECK (
      "email" IS NULL OR "email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
);

CREATE TABLE "ServiceUnit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parentId" TEXT,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "ServiceUnitType" NOT NULL DEFAULT 'POLYCLINIC',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceUnit_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ServiceUnit_code_check" CHECK (char_length(btrim("code")) BETWEEN 1 AND 64),
    CONSTRAINT "ServiceUnit_name_check" CHECK (char_length(btrim("name")) BETWEEN 2 AND 150)
);

CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceUnitId" TEXT,
    "parentId" TEXT,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'ROOM',
    "description" VARCHAR(500),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Location_code_check" CHECK (char_length(btrim("code")) BETWEEN 1 AND 64),
    CONSTRAINT "Location_name_check" CHECK (char_length(btrim("name")) BETWEEN 2 AND 150)
);

CREATE UNIQUE INDEX "HealthcareOrganization_code_key" ON "HealthcareOrganization"("code");
CREATE UNIQUE INDEX "ServiceUnit_organizationId_code_key" ON "ServiceUnit"("organizationId", "code");
CREATE UNIQUE INDEX "Location_organizationId_code_key" ON "Location"("organizationId", "code");

CREATE INDEX "HealthcareOrganization_parentId_active_idx"
  ON "HealthcareOrganization"("parentId", "active");
CREATE INDEX "HealthcareOrganization_active_name_idx"
  ON "HealthcareOrganization"("active", "name");
CREATE INDEX "ServiceUnit_organizationId_active_name_idx"
  ON "ServiceUnit"("organizationId", "active", "name");
CREATE INDEX "ServiceUnit_parentId_idx" ON "ServiceUnit"("parentId");
CREATE INDEX "Location_organizationId_active_name_idx"
  ON "Location"("organizationId", "active", "name");
CREATE INDEX "Location_serviceUnitId_idx" ON "Location"("serviceUnitId");
CREATE INDEX "Location_parentId_idx" ON "Location"("parentId");

ALTER TABLE "HealthcareOrganization"
  ADD CONSTRAINT "HealthcareOrganization_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "HealthcareOrganization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ServiceUnit"
  ADD CONSTRAINT "ServiceUnit_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "HealthcareOrganization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ServiceUnit_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "ServiceUnit"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Location"
  ADD CONSTRAINT "Location_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "HealthcareOrganization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Location_serviceUnitId_fkey"
  FOREIGN KEY ("serviceUnitId") REFERENCES "ServiceUnit"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Location_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Location"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
