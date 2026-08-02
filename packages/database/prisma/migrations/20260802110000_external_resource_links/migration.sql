-- Generic local-to-external linkage for adapters such as SATUSEHAT.
-- Provider identifiers stay outside domain tables.

CREATE TABLE "ExternalResourceLink" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(64) NOT NULL,
    "environment" VARCHAR(32) NOT NULL,
    "resourceType" VARCHAR(64) NOT NULL,
    "localResourceType" VARCHAR(64) NOT NULL,
    "localResourceId" TEXT NOT NULL,
    "externalResourceId" VARCHAR(128) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalResourceLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalResourceLink_localResourceScope_key"
  ON "ExternalResourceLink"(
    "provider",
    "environment",
    "resourceType",
    "localResourceType",
    "localResourceId"
  );

CREATE UNIQUE INDEX "ExternalResourceLink_externalResourceScope_key"
  ON "ExternalResourceLink"(
    "provider",
    "environment",
    "resourceType",
    "externalResourceId"
  );

CREATE INDEX "ExternalResourceLink_localResourceType_localResourceId_idx"
  ON "ExternalResourceLink"("localResourceType", "localResourceId");
