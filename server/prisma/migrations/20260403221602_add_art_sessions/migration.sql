/*
  Warnings:

  - A unique constraint covering the columns `[enrollmentId,sessionId]` on the table `ArtAttendance` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'TARDE';

-- DropIndex
DROP INDEX "ArtAttendance_enrollmentId_classNumber_key";

-- AlterTable
ALTER TABLE "ArtAttendance" ADD COLUMN     "sessionId" INTEGER,
ADD COLUMN     "status" "AttendanceStatus" NOT NULL DEFAULT 'AUSENTE',
ALTER COLUMN "classNumber" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ArtSession" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "topic" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ArtSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtSession_classId_idx" ON "ArtSession"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtAttendance_enrollmentId_sessionId_key" ON "ArtAttendance"("enrollmentId", "sessionId");

-- AddForeignKey
ALTER TABLE "ArtSession" ADD CONSTRAINT "ArtSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ArtClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtAttendance" ADD CONSTRAINT "ArtAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ArtSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
