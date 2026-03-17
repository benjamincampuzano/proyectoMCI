-- CreateTable
CREATE TABLE "ModuleCoordinator" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "moduleName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ModuleCoordinator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleCoordinator_moduleName_idx" ON "ModuleCoordinator"("moduleName");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleCoordinator_userId_moduleName_key" ON "ModuleCoordinator"("userId", "moduleName");

-- AddForeignKey
ALTER TABLE "ModuleCoordinator" ADD CONSTRAINT "ModuleCoordinator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
