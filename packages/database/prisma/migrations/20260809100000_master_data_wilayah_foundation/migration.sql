CREATE TYPE "MasterDataImportStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

CREATE TYPE "MasterRegionLevel" AS ENUM ('PROVINCE', 'REGENCY', 'DISTRICT', 'VILLAGE');

CREATE TABLE "MasterDataImportRun" (
    "id" TEXT NOT NULL,
    "domain" VARCHAR(64) NOT NULL,
    "source" VARCHAR(64) NOT NULL,
    "sourceVersion" VARCHAR(128),
    "status" "MasterDataImportStatus" NOT NULL DEFAULT 'PENDING',
    "recordsSeen" INTEGER NOT NULL DEFAULT 0,
    "recordsUpserted" INTEGER NOT NULL DEFAULT 0,
    "recordsDeactivated" INTEGER NOT NULL DEFAULT 0,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "succeededAt" TIMESTAMP(3),
    "errorCode" VARCHAR(128),
    "errorMessage" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterDataImportRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MasterDataImportRun_domain_attemptedAt_idx"
ON "MasterDataImportRun"("domain", "attemptedAt");

CREATE INDEX "MasterDataImportRun_domain_status_attemptedAt_idx"
ON "MasterDataImportRun"("domain", "status", "attemptedAt");

CREATE TABLE "MasterRegion" (
    "id" TEXT NOT NULL,
    "level" "MasterRegionLevel" NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "parentCode" VARCHAR(32),
    "bpsCode" VARCHAR(32),
    "name" VARCHAR(160) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" VARCHAR(64) NOT NULL,
    "sourceVersion" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterRegion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MasterRegion_level_code_key"
ON "MasterRegion"("level", "code");

CREATE INDEX "MasterRegion_level_parentCode_active_name_idx"
ON "MasterRegion"("level", "parentCode", "active", "name");

CREATE INDEX "MasterRegion_code_idx"
ON "MasterRegion"("code");
