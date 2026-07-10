-- Remove the OAuth device-owner linking (LinkRequest invites + TuyaAccount.customerId).
-- The Smart Life OAuth flow isn't supported for public app accounts, so this is
-- reverted. Dropping the column also drops its FK constraint.
DROP TABLE IF EXISTS "LinkRequest";
ALTER TABLE "TuyaAccount" DROP COLUMN IF EXISTS "customerId";
