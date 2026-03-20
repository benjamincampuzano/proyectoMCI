/*
  Warnings:

  - The primary key for the `_ModuleAuxiliaries` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_ModuleAuxiliaries` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "_ModuleAuxiliaries" DROP CONSTRAINT "_ModuleAuxiliaries_AB_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "_ModuleAuxiliaries_AB_unique" ON "_ModuleAuxiliaries"("A", "B");
