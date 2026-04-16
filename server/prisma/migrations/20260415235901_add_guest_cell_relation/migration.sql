-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "cellId" INTEGER;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;
