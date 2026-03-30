-- AlterTable
ALTER TABLE "SeminarEnrollment" ADD COLUMN     "guardianId" INTEGER;

-- AddForeignKey
ALTER TABLE "SeminarEnrollment" ADD CONSTRAINT "SeminarEnrollment_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
