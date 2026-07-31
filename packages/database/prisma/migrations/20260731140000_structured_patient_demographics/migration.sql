-- PRI-31 adds structured, repeatable patient demographics without removing any
-- compatibility columns from "Patient".

CREATE TYPE "PatientIdentifierType" AS ENUM (
    'NIK',
    'MOTHER_NIK',
    'PASSPORT',
    'FAMILY_CARD',
    'OTHER'
);

CREATE TYPE "VerificationStatus" AS ENUM (
    'UNVERIFIED',
    'VERIFIED',
    'REJECTED',
    'EXPIRED'
);

CREATE TYPE "PatientNameUse" AS ENUM (
    'OFFICIAL',
    'PREFERRED',
    'ALIAS',
    'OLD'
);

CREATE TYPE "TelecomSystem" AS ENUM ('PHONE', 'EMAIL', 'FAX', 'OTHER');
CREATE TYPE "TelecomUse" AS ENUM ('MOBILE', 'HOME', 'WORK', 'TEMP', 'OTHER');
CREATE TYPE "AddressUse" AS ENUM ('HOME', 'WORK', 'TEMP', 'OLD', 'OTHER');
CREATE TYPE "AddressType" AS ENUM ('PHYSICAL', 'POSTAL', 'BOTH');
CREATE TYPE "PatientRelationshipCode" AS ENUM (
    'MOTHER',
    'FATHER',
    'CHILD',
    'GUARDIAN',
    'CAREGIVER',
    'OTHER'
);

ALTER TABLE "Patient"
    ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "birthPlaceText" VARCHAR(255),
    ADD COLUMN "multipleBirthOrder" INTEGER,
    ADD COLUMN "deceasedAt" TIMESTAMP(3),
    ADD COLUMN "maritalStatusCode" VARCHAR(32),
    ADD COLUMN "citizenshipCode" VARCHAR(3),
    ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
    ADD CONSTRAINT "Patient_multiple_birth_order_check"
      CHECK ("multipleBirthOrder" IS NULL OR "multipleBirthOrder" > 0),
    ADD CONSTRAINT "Patient_version_check"
      CHECK ("version" > 0);

CREATE TABLE "PatientIdentifier" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "PatientIdentifierType" NOT NULL,
    "system" VARCHAR(255) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "normalizedValue" VARCHAR(255) NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "issuer" VARCHAR(255),
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientIdentifier_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PatientIdentifier_value_check"
      CHECK (
        char_length(btrim("system")) > 0
        AND char_length(btrim("value")) > 0
        AND char_length(btrim("normalizedValue")) > 0
      ),
    CONSTRAINT "PatientIdentifier_nik_format_check"
      CHECK (
        "type" NOT IN ('NIK', 'MOTHER_NIK')
        OR "normalizedValue" ~ '^[0-9]{16}$'
      ),
    CONSTRAINT "PatientIdentifier_period_check"
      CHECK (
        "validFrom" IS NULL
        OR "validTo" IS NULL
        OR "validTo" >= "validFrom"
      )
);

CREATE TABLE "PatientName" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "use" "PatientNameUse" NOT NULL,
    "text" VARCHAR(255) NOT NULL,
    "given" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "family" VARCHAR(150),
    "prefix" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "suffix" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientName_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PatientName_text_check"
      CHECK (char_length(btrim("text")) BETWEEN 1 AND 255),
    CONSTRAINT "PatientName_period_check"
      CHECK (
        "validFrom" IS NULL
        OR "validTo" IS NULL
        OR "validTo" >= "validFrom"
      )
);

CREATE TABLE "PatientTelecom" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "system" "TelecomSystem" NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "normalizedValue" VARCHAR(255) NOT NULL,
    "use" "TelecomUse" NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 1,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientTelecom_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PatientTelecom_value_check"
      CHECK (
        char_length(btrim("value")) > 0
        AND char_length(btrim("normalizedValue")) > 0
      ),
    CONSTRAINT "PatientTelecom_rank_check" CHECK ("rank" > 0),
    CONSTRAINT "PatientTelecom_period_check"
      CHECK (
        "validFrom" IS NULL
        OR "validTo" IS NULL
        OR "validTo" >= "validFrom"
      )
);

CREATE TABLE "PatientAddress" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "use" "AddressUse" NOT NULL,
    "type" "AddressType" NOT NULL,
    "text" VARCHAR(500),
    "lines" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "postalCode" VARCHAR(16),
    "countryCode" VARCHAR(2),
    "provinceCode" VARCHAR(16),
    "provinceName" VARCHAR(100),
    "regencyCode" VARCHAR(16),
    "regencyName" VARCHAR(100),
    "districtCode" VARCHAR(16),
    "districtName" VARCHAR(100),
    "villageCode" VARCHAR(16),
    "villageName" VARCHAR(100),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAddress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PatientAddress_content_check"
      CHECK (
        NULLIF(btrim(COALESCE("text", '')), '') IS NOT NULL
        OR cardinality("lines") > 0
      ),
    CONSTRAINT "PatientAddress_country_code_check"
      CHECK (
        "countryCode" IS NULL
        OR "countryCode" ~ '^[A-Z]{2}$'
      ),
    CONSTRAINT "PatientAddress_period_check"
      CHECK (
        "validFrom" IS NULL
        OR "validTo" IS NULL
        OR "validTo" >= "validFrom"
      )
);

CREATE TABLE "PatientRelatedPerson" (
    "id" TEXT NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "gender" "Gender",
    "birthDate" DATE,
    "phone" VARCHAR(32),
    "email" VARCHAR(255),
    "addressText" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientRelatedPerson_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PatientRelatedPerson_full_name_check"
      CHECK (char_length(btrim("fullName")) BETWEEN 2 AND 150)
);

CREATE TABLE "PatientRelationship" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "relatedPatientId" TEXT,
    "relatedPersonId" TEXT,
    "relationshipCode" "PatientRelationshipCode" NOT NULL,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "isGuardian" BOOLEAN NOT NULL DEFAULT false,
    "contactPriority" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientRelationship_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PatientRelationship_exactly_one_target_check"
      CHECK (num_nonnulls("relatedPatientId", "relatedPersonId") = 1),
    CONSTRAINT "PatientRelationship_not_self_check"
      CHECK ("relatedPatientId" IS NULL OR "relatedPatientId" <> "patientId"),
    CONSTRAINT "PatientRelationship_period_check"
      CHECK (
        "startAt" IS NULL
        OR "endAt" IS NULL
        OR "endAt" >= "startAt"
      ),
    CONSTRAINT "PatientRelationship_contact_priority_check"
      CHECK ("contactPriority" IS NULL OR "contactPriority" > 0)
);

ALTER TABLE "PatientIdentifier"
  ADD CONSTRAINT "PatientIdentifier_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientName"
  ADD CONSTRAINT "PatientName_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientTelecom"
  ADD CONSTRAINT "PatientTelecom_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientAddress"
  ADD CONSTRAINT "PatientAddress_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientRelationship"
  ADD CONSTRAINT "PatientRelationship_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientRelationship"
  ADD CONSTRAINT "PatientRelationship_relatedPatientId_fkey"
  FOREIGN KEY ("relatedPatientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientRelationship"
  ADD CONSTRAINT "PatientRelationship_relatedPersonId_fkey"
  FOREIGN KEY ("relatedPersonId") REFERENCES "PatientRelatedPerson"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "PatientIdentifier_patientId_type_idx"
  ON "PatientIdentifier"("patientId", "type");
CREATE INDEX "PatientIdentifier_system_normalizedValue_idx"
  ON "PatientIdentifier"("system", "normalizedValue");
CREATE INDEX "PatientName_patientId_use_idx"
  ON "PatientName"("patientId", "use");
CREATE INDEX "PatientTelecom_patientId_system_active_idx"
  ON "PatientTelecom"("patientId", "system", "active");
CREATE INDEX "PatientTelecom_system_normalizedValue_idx"
  ON "PatientTelecom"("system", "normalizedValue");
CREATE INDEX "PatientAddress_patientId_use_active_idx"
  ON "PatientAddress"("patientId", "use", "active");
CREATE INDEX "PatientAddress_region_idx"
  ON "PatientAddress"(
    "provinceCode",
    "regencyCode",
    "districtCode",
    "villageCode"
  );
CREATE INDEX "PatientRelationship_patientId_code_active_idx"
  ON "PatientRelationship"("patientId", "relationshipCode", "active");
CREATE INDEX "PatientRelationship_relatedPatientId_idx"
  ON "PatientRelationship"("relatedPatientId");
CREATE INDEX "PatientRelationship_relatedPersonId_idx"
  ON "PatientRelationship"("relatedPersonId");

-- An active NIK is nationally unique regardless of issuer namespace.
CREATE UNIQUE INDEX "PatientIdentifier_active_nik_national_key"
  ON "PatientIdentifier"("normalizedValue")
  WHERE "type" = 'NIK' AND "active" = true;

-- A patient cannot have two concurrently active NIKs.
CREATE UNIQUE INDEX "PatientIdentifier_active_nik_per_patient_key"
  ON "PatientIdentifier"("patientId")
  WHERE "type" = 'NIK' AND "active" = true;

-- At most one active primary identifier is allowed for each identifier type.
CREATE UNIQUE INDEX "PatientIdentifier_active_primary_per_type_key"
  ON "PatientIdentifier"("patientId", "type")
  WHERE "isPrimary" = true AND "active" = true;

-- Legacy values are copied without parsing ambiguous address text. The original
-- columns remain available for rollback and old API consumers.
INSERT INTO "PatientIdentifier" (
    "id",
    "patientId",
    "type",
    "system",
    "value",
    "normalizedValue",
    "verificationStatus",
    "isPrimary",
    "active",
    "createdAt",
    "updatedAt"
)
SELECT
    'backfill-identifier-' || md5("id"),
    "id",
    'NIK'::"PatientIdentifierType",
    'urn:id:nik',
    "nik",
    "nik",
    'UNVERIFIED'::"VerificationStatus",
    true,
    true,
    "createdAt",
    "updatedAt"
FROM "Patient"
WHERE "nik" IS NOT NULL;

INSERT INTO "PatientName" (
    "id",
    "patientId",
    "use",
    "text",
    "createdAt",
    "updatedAt"
)
SELECT
    'backfill-name-' || md5("id"),
    "id",
    'OFFICIAL'::"PatientNameUse",
    "fullName",
    "createdAt",
    "updatedAt"
FROM "Patient";

INSERT INTO "PatientTelecom" (
    "id",
    "patientId",
    "system",
    "value",
    "normalizedValue",
    "use",
    "rank",
    "verificationStatus",
    "active",
    "createdAt",
    "updatedAt"
)
SELECT
    'backfill-telecom-' || md5("id"),
    "id",
    'PHONE'::"TelecomSystem",
    "phone",
    "phone",
    'MOBILE'::"TelecomUse",
    1,
    'UNVERIFIED'::"VerificationStatus",
    true,
    "createdAt",
    "updatedAt"
FROM "Patient"
WHERE "phone" IS NOT NULL;

INSERT INTO "PatientAddress" (
    "id",
    "patientId",
    "use",
    "type",
    "text",
    "countryCode",
    "active",
    "createdAt",
    "updatedAt"
)
SELECT
    'backfill-address-' || md5("id"),
    "id",
    'HOME'::"AddressUse",
    'PHYSICAL'::"AddressType",
    "address",
    'ID',
    true,
    "createdAt",
    "updatedAt"
FROM "Patient"
WHERE "address" IS NOT NULL;
