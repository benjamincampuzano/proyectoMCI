/*
  Warnings:

  - The values [KIDS,ROCAS] on the enum `Network` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGOUT_ALL';

-- Update values BEFORE changing the enum type
UPDATE "UserProfile" SET "network" = 'KIDS1'::text WHERE "network" = 'KIDS'::text;
UPDATE "UserProfile" SET "network" = 'KIDS2'::text WHERE "network" = 'ROCAS'::text;

-- Rename old enum
ALTER TYPE "Network" RENAME TO "Network_old";

-- Create new enum
CREATE TYPE "Network" AS ENUM ('MUJERES', 'HOMBRES', 'JOVENES', 'KIDS1', 'KIDS2', 'TEENS');

-- Alter column to use new enum
ALTER TABLE "UserProfile" ALTER COLUMN "network" TYPE "Network" USING ("network"::text::"Network");

-- Drop old enum
DROP TYPE "Network_old";
