-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "registeredById" INTEGER;

-- CreateIndex
CREATE INDEX "Guest_registeredById_idx" ON "Guest"("registeredById");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
