CREATE TABLE "MasterMaritalStatus" (
    "code" VARCHAR(32) NOT NULL,
    "display" VARCHAR(160) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "source" VARCHAR(64) NOT NULL,
    "sourceVersion" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterMaritalStatus_pkey" PRIMARY KEY ("code"),
    CONSTRAINT "MasterMaritalStatus_display_check"
      CHECK (char_length(btrim("display")) BETWEEN 1 AND 160),
    CONSTRAINT "MasterMaritalStatus_display_order_check"
      CHECK ("displayOrder" > 0)
);

CREATE INDEX "MasterMaritalStatus_active_displayOrder_display_idx"
ON "MasterMaritalStatus"("active", "displayOrder", "display");
