-- AlterTable
ALTER TABLE "ConventionRegistration" ADD COLUMN     "liderDoceId" INTEGER;

-- AlterTable
ALTER TABLE "EncuentroRegistration" ADD COLUMN     "liderDoceId" INTEGER;

-- CreateIndex
CREATE INDEX "ConventionRegistration_liderDoceId_idx" ON "ConventionRegistration"("liderDoceId");

-- CreateIndex
CREATE INDEX "EncuentroRegistration_liderDoceId_idx" ON "EncuentroRegistration"("liderDoceId");

-- AddForeignKey
ALTER TABLE "ConventionRegistration" ADD CONSTRAINT "ConventionRegistration_liderDoceId_fkey" FOREIGN KEY ("liderDoceId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroRegistration" ADD CONSTRAINT "EncuentroRegistration_liderDoceId_fkey" FOREIGN KEY ("liderDoceId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
