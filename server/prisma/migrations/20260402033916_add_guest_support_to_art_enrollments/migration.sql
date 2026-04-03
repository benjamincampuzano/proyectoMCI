/*
  Warnings:

  - A unique constraint covering the columns `[guestId,classId]` on the table `ArtEnrollment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `finalCost` to the `ArtEnrollment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ArtEnrollment" ADD COLUMN     "discountPercentage" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "finalCost" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "guestId" INTEGER,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ArtEnrollment_guestId_classId_key" ON "ArtEnrollment"("guestId", "classId");

-- AddForeignKey
ALTER TABLE "ArtEnrollment" ADD CONSTRAINT "ArtEnrollment_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
