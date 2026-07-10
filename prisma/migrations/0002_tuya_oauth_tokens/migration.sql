-- AlterTable: add OAuth token fields to TuyaAccount
ALTER TABLE "TuyaAccount"
  ADD COLUMN "accessToken"    TEXT,
  ADD COLUMN "refreshToken"   TEXT,
  ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);
