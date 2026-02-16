-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO', 'UNION_LIBRE', 'SEPARADO');

-- CreateEnum
CREATE TYPE "Network" AS ENUM ('MUJERES', 'HOMBRES', 'JOVENES', 'KIDS', 'ROCAS');

-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'DOCUMENT';

-- AlterTable
ALTER TABLE "Convention" ADD COLUMN     "coordinatorId" INTEGER;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "maritalStatus" "MaritalStatus",
ADD COLUMN     "network" "Network";

-- AlterTable
ALTER TABLE "_ModuleAuxiliaries" ADD CONSTRAINT "_ModuleAuxiliaries_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ModuleAuxiliaries_AB_unique";

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
