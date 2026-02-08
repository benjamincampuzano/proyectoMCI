-- CreateEnum
CREATE TYPE "HierarchyRole" AS ENUM ('PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO', 'MIEMBRO');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'CONSOLIDATE');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('USER', 'GUEST', 'CELL', 'CONVENTION', 'ENCUENTRO', 'CLASS', 'GOAL', 'ENCUENTRO_REGISTRATION', 'CONVENTION_REGISTRATION', 'ENCUENTRO_PAYMENT', 'CONVENTION_PAYMENT', 'ENCUENTRO_ATTENDANCE', 'ORACION_DE_TRES', 'GUEST_CALL', 'GUEST_VISIT');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('DOCUMENT', 'VIDEO', 'QUIZ');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('HOMBRE', 'MUJER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RC', 'TI', 'CC', 'CE', 'PP', 'PEP');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('NUEVO', 'CONTACTADO', 'CONSOLIDADO', 'GANADO');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENTE', 'AUSENTE');

-- CreateEnum
CREATE TYPE "ClassAttendanceStatus" AS ENUM ('ASISTE', 'AUSENCIA_JUSTIFICADA', 'AUSENCIA_NO_JUSTIFICADA', 'BAJA');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('INSCRITO', 'EN_PROGRESO', 'COMPLETADO', 'ABANDONADO');

-- CreateEnum
CREATE TYPE "ConventionType" AS ENUM ('FAMILIAS', 'MUJERES', 'JOVENES', 'HOMBRES');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'CANCELLED', 'ATTENDED');

-- CreateEnum
CREATE TYPE "ConventionPaymentType" AS ENUM ('CONVENTION', 'TRANSPORT', 'ACCOMMODATION');

-- CreateEnum
CREATE TYPE "EncuentroType" AS ENUM ('MUJERES', 'HOMBRES', 'JOVENES');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('ENCUENTRO_REGISTRATIONS', 'ENCUENTRO_CONVERSIONS', 'CONVENTION_REGISTRATIONS', 'CELL_COUNT', 'CELL_ATTENDANCE');

-- CreateEnum
CREATE TYPE "OracionDeTresStatus" AS ENUM ('ACTIVO', 'FINALIZADO');

-- CreateTable
CREATE TABLE "UserHierarchy" (
    "id" SERIAL NOT NULL,
    "parentId" INTEGER NOT NULL,
    "childId" INTEGER NOT NULL,
    "role" "HierarchyRole" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserHierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "cellId" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "sex" "Sex",
    "documentType" "DocumentType",
    "documentNumber" TEXT,
    "birthDate" TIMESTAMPTZ,
    "address" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "documentType" "DocumentType",
    "documentNumber" TEXT,
    "birthDate" TIMESTAMPTZ,
    "sex" "Sex",
    "address" TEXT,
    "city" TEXT,
    "prayerRequest" TEXT,
    "status" "GuestStatus" NOT NULL DEFAULT 'NUEVO',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "called" BOOLEAN NOT NULL DEFAULT false,
    "callObservation" TEXT,
    "visited" BOOLEAN NOT NULL DEFAULT false,
    "visitObservation" TEXT,
    "invitedById" INTEGER NOT NULL,
    "assignedToId" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestCall" (
    "id" SERIAL NOT NULL,
    "guestId" INTEGER NOT NULL,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observation" TEXT NOT NULL,
    "callerId" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestVisit" (
    "id" SERIAL NOT NULL,
    "guestId" INTEGER NOT NULL,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observation" TEXT NOT NULL,
    "visitorId" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cell" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leaderId" INTEGER NOT NULL,
    "hostId" INTEGER,
    "liderDoceId" INTEGER,
    "address" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "dayOfWeek" TEXT,
    "time" TEXT,
    "cellType" TEXT NOT NULL DEFAULT 'ABIERTA',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Cell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurchAttendance" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMPTZ NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENTE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ChurchAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellAttendance" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMPTZ NOT NULL,
    "cellId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENTE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "CellAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeminarModule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "moduleNumber" INTEGER,
    "code" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SEMINARIO',
    "startDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ,
    "professorId" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SeminarModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassMaterial" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "classNumber" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ClassMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassResource" (
    "id" SERIAL NOT NULL,
    "materialId" INTEGER NOT NULL,
    "type" "ResourceType" NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "ClassResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeminarEnrollment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'INSCRITO',
    "assignmentsDone" INTEGER NOT NULL DEFAULT 0,
    "finalProjectGrade" DOUBLE PRECISION,
    "assignedAuxiliarId" INTEGER,
    "projectNotes" TEXT,
    "finalGrade" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SeminarEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassAttendance" (
    "id" SERIAL NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "classNumber" INTEGER NOT NULL,
    "status" "ClassAttendanceStatus" NOT NULL DEFAULT 'ASISTE',
    "grade" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ClassAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Convention" (
    "id" SERIAL NOT NULL,
    "type" "ConventionType" NOT NULL,
    "year" INTEGER NOT NULL,
    "theme" TEXT,
    "cost" DOUBLE PRECISION NOT NULL,
    "transportCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accommodationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMPTZ NOT NULL,
    "endDate" TIMESTAMPTZ NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Convention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConventionLeader" (
    "conventionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "ConventionLeader_pkey" PRIMARY KEY ("conventionId","userId")
);

-- CreateTable
CREATE TABLE "ConventionRegistration" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "conventionId" INTEGER NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "needsTransport" BOOLEAN NOT NULL DEFAULT false,
    "needsAccommodation" BOOLEAN NOT NULL DEFAULT false,
    "registeredById" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ConventionRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConventionPayment" (
    "id" SERIAL NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentType" "ConventionPaymentType" NOT NULL DEFAULT 'CONVENTION',
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ConventionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encuentro" (
    "id" SERIAL NOT NULL,
    "type" "EncuentroType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cost" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMPTZ NOT NULL,
    "endDate" TIMESTAMPTZ NOT NULL,
    "coordinatorId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Encuentro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncuentroLeader" (
    "encuentroId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "EncuentroLeader_pkey" PRIMARY KEY ("encuentroId","userId")
);

-- CreateTable
CREATE TABLE "EncuentroRegistration" (
    "id" SERIAL NOT NULL,
    "guestId" INTEGER,
    "userId" INTEGER,
    "encuentroId" INTEGER NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "EncuentroRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncuentroPayment" (
    "id" SERIAL NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "EncuentroPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncuentroClassAttendance" (
    "id" SERIAL NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "classNumber" INTEGER NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "EncuentroClassAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" "AuditAction" NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" INTEGER,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" SERIAL NOT NULL,
    "type" "GoalType" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "encuentroId" INTEGER,
    "conventionId" INTEGER,
    "month" INTEGER,
    "year" INTEGER,
    "userId" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OracionDeTres" (
    "id" SERIAL NOT NULL,
    "liderDoceId" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMPTZ NOT NULL,
    "fechaFin" TIMESTAMPTZ NOT NULL,
    "estado" "OracionDeTresStatus" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "OracionDeTres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OracionDeTresMiembro" (
    "id" SERIAL NOT NULL,
    "oracionDeTresId" INTEGER NOT NULL,
    "discipuloId" INTEGER NOT NULL,

    CONSTRAINT "OracionDeTresMiembro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OracionDeTresPersona" (
    "id" SERIAL NOT NULL,
    "oracionDeTresId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,

    CONSTRAINT "OracionDeTresPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OracionDeTresReunion" (
    "id" SERIAL NOT NULL,
    "oracionDeTresId" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OracionDeTresReunion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ModuleAuxiliaries" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE INDEX "UserHierarchy_role_idx" ON "UserHierarchy"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserHierarchy_parentId_childId_key" ON "UserHierarchy"("parentId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_documentType_documentNumber_key" ON "UserProfile"("documentType", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Guest_status_idx" ON "Guest"("status");

-- CreateIndex
CREATE INDEX "Guest_createdAt_idx" ON "Guest"("createdAt");

-- CreateIndex
CREATE INDEX "Guest_assignedToId_idx" ON "Guest"("assignedToId");

-- CreateIndex
CREATE INDEX "Guest_invitedById_idx" ON "Guest"("invitedById");

-- CreateIndex
CREATE INDEX "Cell_leaderId_idx" ON "Cell"("leaderId");

-- CreateIndex
CREATE INDEX "Cell_liderDoceId_idx" ON "Cell"("liderDoceId");

-- CreateIndex
CREATE INDEX "Cell_hostId_idx" ON "Cell"("hostId");

-- CreateIndex
CREATE INDEX "ChurchAttendance_date_idx" ON "ChurchAttendance"("date");

-- CreateIndex
CREATE INDEX "ChurchAttendance_createdAt_idx" ON "ChurchAttendance"("createdAt");

-- CreateIndex
CREATE INDEX "ChurchAttendance_status_idx" ON "ChurchAttendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ChurchAttendance_date_userId_key" ON "ChurchAttendance"("date", "userId");

-- CreateIndex
CREATE INDEX "CellAttendance_date_idx" ON "CellAttendance"("date");

-- CreateIndex
CREATE INDEX "CellAttendance_createdAt_idx" ON "CellAttendance"("createdAt");

-- CreateIndex
CREATE INDEX "CellAttendance_status_idx" ON "CellAttendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CellAttendance_date_cellId_userId_key" ON "CellAttendance"("date", "cellId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SeminarModule_code_key" ON "SeminarModule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ClassMaterial_moduleId_classNumber_key" ON "ClassMaterial"("moduleId", "classNumber");

-- CreateIndex
CREATE INDEX "ClassResource_type_idx" ON "ClassResource"("type");

-- CreateIndex
CREATE INDEX "SeminarEnrollment_status_idx" ON "SeminarEnrollment"("status");

-- CreateIndex
CREATE INDEX "SeminarEnrollment_createdAt_idx" ON "SeminarEnrollment"("createdAt");

-- CreateIndex
CREATE INDEX "SeminarEnrollment_moduleId_idx" ON "SeminarEnrollment"("moduleId");

-- CreateIndex
CREATE INDEX "SeminarEnrollment_userId_idx" ON "SeminarEnrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SeminarEnrollment_userId_moduleId_key" ON "SeminarEnrollment"("userId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassAttendance_enrollmentId_classNumber_key" ON "ClassAttendance"("enrollmentId", "classNumber");

-- CreateIndex
CREATE INDEX "Convention_type_idx" ON "Convention"("type");

-- CreateIndex
CREATE INDEX "Convention_startDate_idx" ON "Convention"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Convention_type_year_key" ON "Convention"("type", "year");

-- CreateIndex
CREATE INDEX "ConventionRegistration_status_idx" ON "ConventionRegistration"("status");

-- CreateIndex
CREATE INDEX "ConventionRegistration_createdAt_idx" ON "ConventionRegistration"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConventionRegistration_userId_conventionId_key" ON "ConventionRegistration"("userId", "conventionId");

-- CreateIndex
CREATE INDEX "Encuentro_type_idx" ON "Encuentro"("type");

-- CreateIndex
CREATE INDEX "Encuentro_startDate_idx" ON "Encuentro"("startDate");

-- CreateIndex
CREATE INDEX "EncuentroRegistration_status_idx" ON "EncuentroRegistration"("status");

-- CreateIndex
CREATE INDEX "EncuentroRegistration_createdAt_idx" ON "EncuentroRegistration"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EncuentroRegistration_guestId_encuentroId_key" ON "EncuentroRegistration"("guestId", "encuentroId");

-- CreateIndex
CREATE UNIQUE INDEX "EncuentroRegistration_userId_encuentroId_key" ON "EncuentroRegistration"("userId", "encuentroId");

-- CreateIndex
CREATE UNIQUE INDEX "EncuentroClassAttendance_registrationId_classNumber_key" ON "EncuentroClassAttendance"("registrationId", "classNumber");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "OracionDeTres_liderDoceId_idx" ON "OracionDeTres"("liderDoceId");

-- CreateIndex
CREATE INDEX "OracionDeTres_estado_idx" ON "OracionDeTres"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "OracionDeTresMiembro_oracionDeTresId_discipuloId_key" ON "OracionDeTresMiembro"("oracionDeTresId", "discipuloId");

-- CreateIndex
CREATE INDEX "OracionDeTresReunion_oracionDeTresId_idx" ON "OracionDeTresReunion"("oracionDeTresId");

-- CreateIndex
CREATE UNIQUE INDEX "_ModuleAuxiliaries_AB_unique" ON "_ModuleAuxiliaries"("A", "B");

-- CreateIndex
CREATE INDEX "_ModuleAuxiliaries_B_index" ON "_ModuleAuxiliaries"("B");

-- AddForeignKey
ALTER TABLE "UserHierarchy" ADD CONSTRAINT "UserHierarchy_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHierarchy" ADD CONSTRAINT "UserHierarchy_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestCall" ADD CONSTRAINT "GuestCall_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestCall" ADD CONSTRAINT "GuestCall_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestVisit" ADD CONSTRAINT "GuestVisit_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestVisit" ADD CONSTRAINT "GuestVisit_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_liderDoceId_fkey" FOREIGN KEY ("liderDoceId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurchAttendance" ADD CONSTRAINT "ChurchAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellAttendance" ADD CONSTRAINT "CellAttendance_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellAttendance" ADD CONSTRAINT "CellAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeminarModule" ADD CONSTRAINT "SeminarModule_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMaterial" ADD CONSTRAINT "ClassMaterial_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SeminarModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassResource" ADD CONSTRAINT "ClassResource_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "ClassMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeminarEnrollment" ADD CONSTRAINT "SeminarEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeminarEnrollment" ADD CONSTRAINT "SeminarEnrollment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SeminarModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeminarEnrollment" ADD CONSTRAINT "SeminarEnrollment_assignedAuxiliarId_fkey" FOREIGN KEY ("assignedAuxiliarId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "SeminarEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAttendance" ADD CONSTRAINT "ClassAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionLeader" ADD CONSTRAINT "ConventionLeader_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionLeader" ADD CONSTRAINT "ConventionLeader_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionRegistration" ADD CONSTRAINT "ConventionRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionRegistration" ADD CONSTRAINT "ConventionRegistration_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionRegistration" ADD CONSTRAINT "ConventionRegistration_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConventionPayment" ADD CONSTRAINT "ConventionPayment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "ConventionRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encuentro" ADD CONSTRAINT "Encuentro_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroLeader" ADD CONSTRAINT "EncuentroLeader_encuentroId_fkey" FOREIGN KEY ("encuentroId") REFERENCES "Encuentro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroLeader" ADD CONSTRAINT "EncuentroLeader_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroRegistration" ADD CONSTRAINT "EncuentroRegistration_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroRegistration" ADD CONSTRAINT "EncuentroRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroRegistration" ADD CONSTRAINT "EncuentroRegistration_encuentroId_fkey" FOREIGN KEY ("encuentroId") REFERENCES "Encuentro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroPayment" ADD CONSTRAINT "EncuentroPayment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EncuentroRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncuentroClassAttendance" ADD CONSTRAINT "EncuentroClassAttendance_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EncuentroRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_encuentroId_fkey" FOREIGN KEY ("encuentroId") REFERENCES "Encuentro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OracionDeTres" ADD CONSTRAINT "OracionDeTres_liderDoceId_fkey" FOREIGN KEY ("liderDoceId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OracionDeTresMiembro" ADD CONSTRAINT "OracionDeTresMiembro_oracionDeTresId_fkey" FOREIGN KEY ("oracionDeTresId") REFERENCES "OracionDeTres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OracionDeTresMiembro" ADD CONSTRAINT "OracionDeTresMiembro_discipuloId_fkey" FOREIGN KEY ("discipuloId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OracionDeTresPersona" ADD CONSTRAINT "OracionDeTresPersona_oracionDeTresId_fkey" FOREIGN KEY ("oracionDeTresId") REFERENCES "OracionDeTres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OracionDeTresReunion" ADD CONSTRAINT "OracionDeTresReunion_oracionDeTresId_fkey" FOREIGN KEY ("oracionDeTresId") REFERENCES "OracionDeTres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleAuxiliaries" ADD CONSTRAINT "_ModuleAuxiliaries_A_fkey" FOREIGN KEY ("A") REFERENCES "SeminarModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleAuxiliaries" ADD CONSTRAINT "_ModuleAuxiliaries_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
