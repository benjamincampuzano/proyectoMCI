-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isCoordinator" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "User_isCoordinator_idx" ON "User"("isCoordinator");
