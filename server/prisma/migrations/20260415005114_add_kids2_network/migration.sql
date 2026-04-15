/*
  Warnings:

  - The values [KIDS,ROCAS] on the enum `Network` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'LOGOUT_ALL';

-- AlterEnum
BEGIN;
-- Map old values to new ones before changing the type to avoid casting errors
UPDATE "UserProfile" SET "network" = 'KIDS1' WHERE "network" = 'KIDS';
UPDATE "UserProfile" SET "network" = 'KIDS2' WHERE "network" = 'ROCAS';

CREATE TYPE "Network_new" AS ENUM ('MUJERES', 'HOMBRES', 'JOVENES', 'KIDS1', 'KIDS2', 'TEENS');
ALTER TABLE "UserProfile" ALTER COLUMN "network" TYPE "Network_new" USING ("network"::text::"Network_new");
ALTER TYPE "Network" RENAME TO "Network_old";
ALTER TYPE "Network_new" RENAME TO "Network";
DROP TYPE "public"."Network_old";
COMMIT;

