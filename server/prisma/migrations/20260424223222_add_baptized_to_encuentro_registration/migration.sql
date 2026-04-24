-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'LOGOUT_ALL';

-- AlterTable
ALTER TABLE "EncuentroRegistration" ADD COLUMN     "isBaptized" BOOLEAN NOT NULL DEFAULT false;
