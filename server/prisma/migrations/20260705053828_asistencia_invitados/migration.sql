/*
  Warnings:

  - A unique constraint covering the columns `[date,cellId,guestId]` on the table `CellAttendance` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ConventionRegistration" DROP CONSTRAINT "ConventionRegistration_userId_fkey";

-- AlterTable
ALTER TABLE "CellAttendance" ADD COLUMN     "guestId" INTEGER,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CellAttendance_date_cellId_guestId_key" ON "CellAttendance"("date", "cellId", "guestId");

-- AddForeignKey
ALTER TABLE "CellAttendance" ADD CONSTRAINT "CellAttendance_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionRegistration" ADD CONSTRAINT "ConventionRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
