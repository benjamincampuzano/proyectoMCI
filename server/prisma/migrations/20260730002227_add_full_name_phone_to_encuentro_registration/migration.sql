-- AlterTable
ALTER TABLE "EncuentroRegistration" ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE INDEX "EncuentroRegistration_fullName_idx" ON "EncuentroRegistration"("fullName");
