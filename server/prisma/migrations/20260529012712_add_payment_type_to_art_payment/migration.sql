-- CreateEnum
CREATE TYPE "ArtPaymentType" AS ENUM ('TUITION', 'MATERIAL', 'OTHER');

-- AlterTable
ALTER TABLE "ArtPayment" ADD COLUMN     "paymentType" "ArtPaymentType" NOT NULL DEFAULT 'TUITION';
