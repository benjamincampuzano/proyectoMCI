-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'KIDS_SCHEDULE';

-- CreateTable
CREATE TABLE "KidsSchedule" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "lesson" TEXT NOT NULL,
    "bibleReading" TEXT NOT NULL,
    "memoryVerse" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "teacherId" INTEGER,
    "auxiliaryId" INTEGER,
    "observations" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "KidsSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KidsSchedule_moduleId_idx" ON "KidsSchedule"("moduleId");

-- CreateIndex
CREATE INDEX "KidsSchedule_date_idx" ON "KidsSchedule"("date");

-- AddForeignKey
ALTER TABLE "KidsSchedule" ADD CONSTRAINT "KidsSchedule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SeminarModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KidsSchedule" ADD CONSTRAINT "KidsSchedule_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KidsSchedule" ADD CONSTRAINT "KidsSchedule_auxiliaryId_fkey" FOREIGN KEY ("auxiliaryId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
