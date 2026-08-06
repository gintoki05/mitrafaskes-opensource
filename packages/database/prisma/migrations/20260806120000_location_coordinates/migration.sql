ALTER TABLE "Location"
  ADD COLUMN "latitude" DECIMAL(10, 7),
  ADD COLUMN "longitude" DECIMAL(10, 7),
  ADD COLUMN "altitude" DECIMAL(10, 3);

ALTER TABLE "Location"
  ADD CONSTRAINT "Location_latitude_check"
    CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "Location_longitude_check"
    CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);
