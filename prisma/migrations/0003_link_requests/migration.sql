-- Link an account to an owning customer
ALTER TABLE "TuyaAccount" ADD COLUMN "customerId" TEXT;

ALTER TABLE "TuyaAccount"
  ADD CONSTRAINT "TuyaAccount_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Per-customer OAuth link invitations (id is used as the OAuth `state`)
CREATE TABLE "LinkRequest" (
  "id"         TEXT NOT NULL,
  "label"      TEXT NOT NULL DEFAULT 'Smart Life account',
  "region"     TEXT NOT NULL DEFAULT 'us',
  "status"     TEXT NOT NULL DEFAULT 'pending',
  "error"      TEXT,
  "customerId" TEXT,
  "accountId"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "linkedAt"   TIMESTAMP(3),
  CONSTRAINT "LinkRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LinkRequest"
  ADD CONSTRAINT "LinkRequest_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LinkRequest"
  ADD CONSTRAINT "LinkRequest_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "TuyaAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
