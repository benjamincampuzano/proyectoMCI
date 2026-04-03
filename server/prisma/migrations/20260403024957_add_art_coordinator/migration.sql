-- AlterTable
ALTER TABLE "ArtClass" ADD COLUMN     "coordinatorId" INTEGER;

-- AddForeignKey
ALTER TABLE "ArtClass" ADD CONSTRAINT "ArtClass_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
