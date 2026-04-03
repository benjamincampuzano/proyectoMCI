-- CreateTable
CREATE TABLE "ModuleSubCoordinator" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "moduleName" TEXT NOT NULL,
    "coordinatorId" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ModuleSubCoordinator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleSubCoordinator_moduleName_idx" ON "ModuleSubCoordinator"("moduleName");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleSubCoordinator_userId_moduleName_key" ON "ModuleSubCoordinator"("userId", "moduleName");

-- AddForeignKey
ALTER TABLE "ModuleSubCoordinator" ADD CONSTRAINT "ModuleSubCoordinator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleSubCoordinator" ADD CONSTRAINT "ModuleSubCoordinator_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
