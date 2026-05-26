-- Performance indexes for high-traffic queries
-- Created: 2026-05-24

-- 1. UserHierarchy: crucial for getLiderDoceName, getUserNetwork (recursive CTE), getGeneralStats
CREATE INDEX IF NOT EXISTS "idx_user_hierarchy_parent" ON "UserHierarchy" ("parentId");
CREATE INDEX IF NOT EXISTS "idx_user_hierarchy_child" ON "UserHierarchy" ("childId");
CREATE INDEX IF NOT EXISTS "idx_user_hierarchy_child_role" ON "UserHierarchy" ("childId", "role");

-- 2. Guest: heavy filtering by invitedById, assignedToId, createdAt
CREATE INDEX IF NOT EXISTS "idx_guest_invited" ON "Guest" ("invitedById");
CREATE INDEX IF NOT EXISTS "idx_guest_assigned" ON "Guest" ("assignedToId");
CREATE INDEX IF NOT EXISTS "idx_guest_created_status" ON "Guest" ("createdAt", "status");

-- 3. ChurchAttendance: date-range queries in getGeneralStats
CREATE INDEX IF NOT EXISTS "idx_church_attendance_date" ON "ChurchAttendance" ("date");
CREATE INDEX IF NOT EXISTS "idx_church_attendance_user_date" ON "ChurchAttendance" ("userId", "date");

-- 4. CellAttendance: date + cellId range filtering
CREATE INDEX IF NOT EXISTS "idx_cell_attendance_cell_date" ON "CellAttendance" ("cellId", "date");

-- 5. AuditLog: cleanup cron + activity list queries
CREATE INDEX IF NOT EXISTS "idx_audit_log_action_date" ON "AuditLog" ("action", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_audit_log_created" ON "AuditLog" ("createdAt");

-- 6. SeminarEnrollment: module-based stats
CREATE INDEX IF NOT EXISTS "idx_seminar_enrollment_module" ON "SeminarEnrollment" ("moduleId");

-- 7. EncuentroRegistration & ConventionRegistration: stats queries
CREATE INDEX IF NOT EXISTS "idx_encuentro_registration_encuentro" ON "EncuentroRegistration" ("encuentroId");
CREATE INDEX IF NOT EXISTS "idx_convention_registration_convention" ON "ConventionRegistration" ("conventionId");

-- 8. User: isDeleted + roles filtering (count queries)
CREATE INDEX IF NOT EXISTS "idx_user_is_deleted" ON "User" ("isDeleted");

-- 9. RefreshToken: cleanup cron
CREATE INDEX IF NOT EXISTS "idx_refresh_token_expires" ON "RefreshToken" ("expiresAt", "isRevoked");
