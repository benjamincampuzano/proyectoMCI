/*
  Warnings:

  - A unique constraint covering the columns `[parentId,childId,role]` on the table `UserHierarchy` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UserHierarchy_parentId_childId_key";

-- CreateIndex
CREATE UNIQUE INDEX "UserHierarchy_parentId_childId_role_key" ON "UserHierarchy"("parentId", "childId", "role");
