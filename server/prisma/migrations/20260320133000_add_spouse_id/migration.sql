-- AlterTable
ALTER TABLE "User" ADD COLUMN "spouseId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_spouseId_key" ON "User"("spouseId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_spouseId_fkey" FOREIGN KEY ("spouseId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
