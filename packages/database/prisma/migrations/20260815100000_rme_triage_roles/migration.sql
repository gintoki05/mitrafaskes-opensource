-- PERAWAT now represents the clinical triage role. Registration users use the
-- separate PETUGAS_PENDAFTARAN role; existing PERAWAT accounts intentionally
-- retain their enum value and receive the new clinical permission matrix.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PETUGAS_PENDAFTARAN';

CREATE TYPE "TriageStatus" AS ENUM ('NOT_STARTED', 'DRAFT', 'COMPLETED');

ALTER TABLE "MedicalRecord"
  ADD COLUMN "triageStatus" "TriageStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "triageUpdatedBy" VARCHAR(128),
  ADD COLUMN "triageUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "triageCompletedBy" VARCHAR(128),
  ADD COLUMN "triageCompletedAt" TIMESTAMP(3);
