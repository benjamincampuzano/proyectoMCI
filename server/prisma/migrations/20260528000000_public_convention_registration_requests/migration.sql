INSERT INTO pg_enum (enumtypid, enumlabel, enumsortorder)
SELECT
  'RegistrationStatus'::regtype,
  'PENDING',
  (SELECT MAX(enumsortorder) + 1 FROM pg_enum WHERE enumtypid = 'RegistrationStatus'::regtype)
ON CONFLICT (enumtypid, enumlabel) DO NOTHING;

ALTER TABLE "ConventionRegistration"
ADD COLUMN IF NOT EXISTS "fullName" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT;

ALTER TABLE "ConventionRegistration"
ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "ConventionRegistration"
ALTER COLUMN "status" SET DEFAULT 'PENDING';

UPDATE "ConventionRegistration" cr
SET
  "fullName" = COALESCE(cr."fullName", up."fullName"),
  "phone" = COALESCE(cr."phone", u."phone")
FROM "User" u
LEFT JOIN "UserProfile" up ON up."userId" = u."id"
WHERE cr."userId" = u."id"
  AND cr."fullName" IS NULL;

CREATE INDEX IF NOT EXISTS "ConventionRegistration_conventionId_status_idx"
ON "ConventionRegistration" ("conventionId", "status");

CREATE INDEX IF NOT EXISTS "ConventionRegistration_fullName_idx"
ON "ConventionRegistration" ("fullName");
