-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('VIP_PLATEA', 'GENERAL');

-- AlterTable
ALTER TABLE "Convention" ADD COLUMN     "generalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "vipPlateaCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ConventionRegistration" ADD COLUMN     "ticketType" "TicketType" NOT NULL DEFAULT 'GENERAL';
