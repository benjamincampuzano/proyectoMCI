-- AlterTable
ALTER TABLE "ClassResource" ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "_ModuleAuxiliaries" ADD CONSTRAINT "_ModuleAuxiliaries_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ModuleAuxiliaries_AB_unique";
