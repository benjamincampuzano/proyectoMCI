-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'REGISTRAR_CODE';

-- CreateTable
CREATE TABLE "RegistrarCode" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RegistrarCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrarCode_code_key" ON "RegistrarCode"("code");

-- CreateIndex
CREATE INDEX "RegistrarCode_userId_idx" ON "RegistrarCode"("userId");

-- CreateIndex
CREATE INDEX "RegistrarCode_code_idx" ON "RegistrarCode"("code");

-- CreateIndex
CREATE INDEX "RegistrarCode_isActive_idx" ON "RegistrarCode"("isActive");

-- AddForeignKey
ALTER TABLE "RegistrarCode" ADD CONSTRAINT "RegistrarCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
