-- CreateIndex
CREATE INDEX "ModuleCoordinator_moduleName_isDeleted_idx" ON "ModuleCoordinator"("moduleName", "isDeleted");

-- CreateIndex
CREATE INDEX "ModuleSubCoordinator_moduleName_isDeleted_idx" ON "ModuleSubCoordinator"("moduleName", "isDeleted");

-- CreateIndex
CREATE INDEX "ModuleTreasurer_moduleName_isDeleted_idx" ON "ModuleTreasurer"("moduleName", "isDeleted");
