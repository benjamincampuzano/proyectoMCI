-- CreateEnum
CREATE TYPE "EncuentroPaymentType" AS ENUM ('ENCUENTRO', 'TRANSPORT', 'ACCOMMODATION');

-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'JUSTIFICADO';

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'EXPORT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EntityType" ADD VALUE 'KIDS_GROUP';
ALTER TYPE "EntityType" ADD VALUE 'KID';
ALTER TYPE "EntityType" ADD VALUE 'KID_ATTENDANCE';

-- AlterTable
ALTER TABLE "Encuentro" ADD COLUMN     "accommodationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "transportCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EncuentroPayment" ADD COLUMN     "paymentType" "EncuentroPaymentType" NOT NULL DEFAULT 'ENCUENTRO';

-- AlterTable
ALTER TABLE "EncuentroRegistration" ADD COLUMN     "needsAccommodation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsTransport" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
