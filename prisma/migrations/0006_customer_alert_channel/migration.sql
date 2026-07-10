-- Per-customer alert channel + email address.
CREATE TYPE "AlertChannel" AS ENUM ('SMS', 'EMAIL', 'BOTH');

ALTER TABLE "Customer"
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "alertChannel" "AlertChannel" NOT NULL DEFAULT 'SMS';
