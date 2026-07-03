-- AlterTable
ALTER TABLE "ChurchAttendance" ADD COLUMN "guestId" INTEGER;
ALTER TABLE "ChurchAttendance" ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ChurchAttendance_date_guestId_key" ON "ChurchAttendance"("date", "guestId");

-- CreateIndex
CREATE INDEX "ChurchAttendance_guestId_date_idx" ON "ChurchAttendance"("guestId", "date");

-- AddForeignKey
ALTER TABLE "ChurchAttendance" ADD CONSTRAINT "ChurchAttendance_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
