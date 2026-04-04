-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EntityType" ADD VALUE 'MODULE_COORDINATOR';
ALTER TYPE "EntityType" ADD VALUE 'MODULE_SUBCOORDINATOR';
ALTER TYPE "EntityType" ADD VALUE 'MODULE_TREASURER';

-- DropForeignKey
ALTER TABLE "ModuleCoordinator" DROP CONSTRAINT "ModuleCoordinator_userId_fkey";

-- DropForeignKey
ALTER TABLE "ModuleSubCoordinator" DROP CONSTRAINT "ModuleSubCoordinator_userId_fkey";

-- DropForeignKey
ALTER TABLE "ModuleTreasurer" DROP CONSTRAINT "ModuleTreasurer_userId_fkey";

-- DropIndex
DROP INDEX "ModuleCoordinator_userId_moduleName_key";

-- DropIndex
DROP INDEX "ModuleSubCoordinator_userId_moduleName_key";

-- DropIndex
DROP INDEX "ModuleTreasurer_userId_moduleName_key";

-- AlterTable
ALTER TABLE "ModuleCoordinator" ADD COLUMN     "deletedAt" TIMESTAMPTZ(6),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ModuleSubCoordinator" ADD COLUMN     "deletedAt" TIMESTAMPTZ(6),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ModuleTreasurer" ADD COLUMN     "deletedAt" TIMESTAMPTZ(6),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ModuleCoordinator_userId_moduleName_idx" ON "ModuleCoordinator"("userId", "moduleName");

-- CreateIndex
CREATE INDEX "ModuleSubCoordinator_userId_moduleName_idx" ON "ModuleSubCoordinator"("userId", "moduleName");

-- CreateIndex
CREATE INDEX "ModuleSubCoordinator_coordinatorId_idx" ON "ModuleSubCoordinator"("coordinatorId");

-- CreateIndex
CREATE INDEX "ModuleTreasurer_userId_moduleName_idx" ON "ModuleTreasurer"("userId", "moduleName");

-- AddForeignKey
ALTER TABLE "ModuleCoordinator" ADD CONSTRAINT "ModuleCoordinator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleSubCoordinator" ADD CONSTRAINT "ModuleSubCoordinator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleTreasurer" ADD CONSTRAINT "ModuleTreasurer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
