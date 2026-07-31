-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DOKTER', 'PERAWAT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- Keep CANCELLED as the queue cancellation term for PRI-14.
CREATE TYPE "EncounterStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- Sequence allocation is independent of table size and safe under concurrent inserts.
CREATE SEQUENCE "patient_medical_record_number_seq"
    AS BIGINT
    START WITH 3
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "sipNumber" TEXT,
    "strNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "nik" VARCHAR(16),
    "fullName" VARCHAR(150) NOT NULL,
    "birthDate" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "address" VARCHAR(500),
    "phone" VARCHAR(16),
    "medicalRecNo" VARCHAR(32) NOT NULL,
    "satusehatId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Patient_nik_format_check"
      CHECK ("nik" IS NULL OR "nik" ~ '^[0-9]{16}$'),
    CONSTRAINT "Patient_full_name_check"
      CHECK (char_length(btrim("fullName")) BETWEEN 2 AND 150),
    CONSTRAINT "Patient_birth_date_check"
      CHECK ("birthDate" <= CURRENT_DATE),
    CONSTRAINT "Patient_phone_format_check"
      CHECK (
        "phone" IS NULL
        OR "phone" ~ '^([+]?[1-9][0-9]{7,14}|0[0-9]{7,14})$'
      ),
    CONSTRAINT "Patient_medical_record_number_format_check"
      CHECK ("medicalRecNo" ~ '^RM-[0-9]{4}-[0-9]{6,}$')
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "queueNumber" INTEGER NOT NULL,
    "status" "EncounterStatus" NOT NULL DEFAULT 'WAITING',
    "satusehatEncounterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "anamnesis" TEXT,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "heartRate" INTEGER,
    "temperature" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterIcd10" (
    "code" TEXT NOT NULL,
    "nameIndo" TEXT NOT NULL,
    "nameEng" TEXT NOT NULL,

    CONSTRAINT "MasterIcd10_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" TEXT NOT NULL,
    "medicalRecordId" TEXT NOT NULL,
    "icd10Code" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "satusehatConditionId" TEXT,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "medicalRecordId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "kfaCode" TEXT,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "instructions" TEXT,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SatusehatSyncLog" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "satusehatId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SatusehatSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- PostgreSQL allows multiple NULL values while rejecting duplicate normalized NIKs.
CREATE UNIQUE INDEX "Patient_nik_key" ON "Patient"("nik");

-- The unique index is a final guard if a legacy number overlaps a sequence value.
CREATE UNIQUE INDEX "Patient_medicalRecNo_key" ON "Patient"("medicalRecNo");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalRecord_encounterId_key" ON "MedicalRecord"("encounterId");

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_icd10Code_fkey" FOREIGN KEY ("icd10Code") REFERENCES "MasterIcd10"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
