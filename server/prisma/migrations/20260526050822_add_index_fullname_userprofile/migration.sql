-- DropIndex
DROP INDEX "idx_guest_created_status";

-- CreateIndex
CREATE INDEX "UserProfile_fullName_idx" ON "UserProfile"("fullName");

-- RenameIndex
ALTER INDEX "idx_audit_log_action_date" RENAME TO "AuditLog_action_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_cell_attendance_cell_date" RENAME TO "CellAttendance_cellId_date_idx";

-- RenameIndex
ALTER INDEX "idx_church_attendance_user_date" RENAME TO "ChurchAttendance_userId_date_idx";

-- RenameIndex
ALTER INDEX "idx_convention_registration_convention" RENAME TO "ConventionRegistration_conventionId_idx";

-- RenameIndex
ALTER INDEX "idx_encuentro_registration_encuentro" RENAME TO "EncuentroRegistration_encuentroId_idx";

-- RenameIndex
ALTER INDEX "idx_refresh_token_expires" RENAME TO "RefreshToken_expiresAt_isRevoked_idx";

-- RenameIndex
ALTER INDEX "idx_user_is_deleted" RENAME TO "User_isDeleted_idx";

-- RenameIndex
ALTER INDEX "idx_user_hierarchy_child" RENAME TO "UserHierarchy_childId_idx";

-- RenameIndex
ALTER INDEX "idx_user_hierarchy_child_role" RENAME TO "UserHierarchy_childId_role_idx";

-- RenameIndex
ALTER INDEX "idx_user_hierarchy_parent" RENAME TO "UserHierarchy_parentId_idx";
