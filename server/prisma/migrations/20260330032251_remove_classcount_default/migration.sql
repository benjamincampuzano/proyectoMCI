-- AlterTable
ALTER TABLE "ClassAttendance" ALTER COLUMN "status" SET DEFAULT 'SIN_CLASE';

-- AlterTable
ALTER TABLE "SeminarModule" ALTER COLUMN "classCount" DROP NOT NULL,
ALTER COLUMN "classCount" DROP DEFAULT;
