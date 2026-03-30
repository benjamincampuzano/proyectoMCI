/*
  Warnings:

  - You are about to drop the column `professorId` on the `SeminarModule` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SeminarModule" DROP CONSTRAINT "SeminarModule_professorId_fkey";

-- AlterTable
ALTER TABLE "SeminarModule" DROP COLUMN "professorId",
ADD COLUMN     "professorIds" INTEGER[];

-- CreateTable
CREATE TABLE "_ModuleProfessors" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ModuleProfessors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ModuleProfessors_B_index" ON "_ModuleProfessors"("B");

-- AddForeignKey
ALTER TABLE "_ModuleProfessors" ADD CONSTRAINT "_ModuleProfessors_A_fkey" FOREIGN KEY ("A") REFERENCES "SeminarModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleProfessors" ADD CONSTRAINT "_ModuleProfessors_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
