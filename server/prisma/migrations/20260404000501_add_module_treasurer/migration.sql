-- CreateTable
CREATE TABLE "ModuleTreasurer" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "moduleName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ModuleTreasurer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleTreasurer_moduleName_idx" ON "ModuleTreasurer"("moduleName");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleTreasurer_userId_moduleName_key" ON "ModuleTreasurer"("userId", "moduleName");

-- AddForeignKey
ALTER TABLE "ModuleTreasurer" ADD CONSTRAINT "ModuleTreasurer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
