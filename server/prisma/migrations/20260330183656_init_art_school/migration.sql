-- CreateEnum
CREATE TYPE "ArtRole" AS ENUM ('COORDINADOR', 'TESORERO', 'PROFESOR', 'ESTUDIANTE');

-- CreateTable
CREATE TABLE "ArtSchoolRole" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "ArtRole" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtSchoolRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtClass" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMPTZ(6),
    "endDate" TIMESTAMPTZ(6),
    "professorId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ArtClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtEnrollment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'INSCRITO',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ArtEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtAttendance" (
    "id" SERIAL NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "classNumber" INTEGER NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ArtAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtPayment" (
    "id" SERIAL NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "registeredById" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ArtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtSchoolRole_role_idx" ON "ArtSchoolRole"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ArtSchoolRole_userId_role_key" ON "ArtSchoolRole"("userId", "role");

-- CreateIndex
CREATE INDEX "ArtEnrollment_status_idx" ON "ArtEnrollment"("status");

-- CreateIndex
CREATE INDEX "ArtEnrollment_createdAt_idx" ON "ArtEnrollment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArtEnrollment_userId_classId_key" ON "ArtEnrollment"("userId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtAttendance_enrollmentId_classNumber_key" ON "ArtAttendance"("enrollmentId", "classNumber");

-- AddForeignKey
ALTER TABLE "ArtSchoolRole" ADD CONSTRAINT "ArtSchoolRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtClass" ADD CONSTRAINT "ArtClass_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtEnrollment" ADD CONSTRAINT "ArtEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtEnrollment" ADD CONSTRAINT "ArtEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ArtClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtAttendance" ADD CONSTRAINT "ArtAttendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "ArtEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtPayment" ADD CONSTRAINT "ArtPayment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "ArtEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtPayment" ADD CONSTRAINT "ArtPayment_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
