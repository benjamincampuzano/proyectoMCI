/*
  Warnings:

  - You are about to drop the column `studentId` on the `KidsClassPhoto` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "KidsClassPhoto" DROP CONSTRAINT "KidsClassPhoto_studentId_fkey";

-- DropIndex
DROP INDEX "KidsClassPhoto_studentId_idx";

-- AlterTable
ALTER TABLE "KidsClassPhoto" DROP COLUMN "studentId";
