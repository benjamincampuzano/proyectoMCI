-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'LOGIN_FAILED';

-- AlterTable
ALTER TABLE "Cell" ADD COLUMN     "barrio" TEXT,
ADD COLUMN     "fastingDate" TIMESTAMPTZ(6),
ADD COLUMN     "network" TEXT DEFAULT 'MIXTA',
ADD COLUMN     "pastorsMeeting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rhemaWord" TEXT,
ADD COLUMN     "spiritualMappingUrl" TEXT;

-- CreateIndex
CREATE INDEX "Cell_network_idx" ON "Cell"("network");
