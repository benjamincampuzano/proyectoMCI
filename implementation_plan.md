# Refactor and Optimization Plan

## Goal Description

Implement a series of codebase improvements for the Proyecto Iglesia application:
1. Consolidate duplicate access‑check logic in `Enviar.jsx` and propagate the change to other modules.
2. Pass the `treasurer` prop to `CoordinatorDisplay` in `Enviar.jsx`.
3. Align `Ganar.jsx` and `Consolidar.jsx` with the unified `/coordinators/module/:module/roles` endpoint, add refresh triggers, and standardize the `useAuth` import path.
4. Add missing indexes to `schema.prisma` for performance (fullName, network, and composite indexes on module tables).
5. Refactor `coordinatorController.js` to use the cached `req.userNetwork` from middleware across all functions that previously queried the user’s network.
6. Ensure `coordinatorAuth.js` correctly populates `req.userNetwork`.
7. Investigate and resolve the silent‑save issue in `CellManagement.jsx`.
8. Run the required Prisma migrations.
9. Verify functionality with existing tests.

---

## User Review Required

> **[!IMPORTANT]**
> This plan modifies many files across both client and server code, introduces new database migrations, and changes API usage. Please confirm that you want to proceed with all these changes.

---

## Open Questions

- Do you want the new consolidated endpoint (`GET /coordinators/module/:module/roles`) to replace the existing individual role endpoints, or should we keep the old ones for backward compatibility?
- For the `CellManagement.jsx` fix, should we add user‑visible toast messages on success/failure, or simply log to console?
- Do you prefer running the Prisma migration now (which may affect the dev database) or defer it until a later deployment?

---

## Proposed Changes

### Server – Schema and Migrations

#### [MODIFY] `server/prisma/schema.prisma`
- Add `@@index([fullName])` to `UserProfile`.
- Add `@@index([network])` to `UserProfile`.
- Add `@@index([moduleName, isDeleted])` to `ModuleCoordinator`, `ModuleSubCoordinator`, `ModuleTreasurer` (composite index).
- Ensure migrations are generated with `prisma migrate dev --name add_indexes_userprofile_module`

---

### Server – Middleware

#### [MODIFY] `server/middleware/coordinatorAuth.js`
- Ensure after token validation, `req.userNetwork` is set using `prisma.user.findUnique` (already present). No further changes needed but confirm export.

---

### Server – Controller Refactor

#### [MODIFY] `server/controllers/coordinatorController.js`
- Update **all** functions that query the requester’s network (`getModuleCoordinators`, `assignModuleCoordinator`, `assignModuleTreasurer`, `getAllSubCoordinators`, `getAllTreasurers`, and any other similar functions) to replace the duplicated `prisma.user.findUnique` block with:
```js
const requesterNetwork = req.userNetwork;
if (requesterNetwork) {
  where.profile = { network: requesterNetwork };
}
```
- Replace existing network‑fetch code accordingly.
- Ensure imports remain unchanged.

---

### Client – Access Check Refactor

#### [MODIFY] `client/src/components/Enviar.jsx`
- Create reusable variables at component start:
```js
const isModuleCoordinator = isCoordinator('enviar');
const isModuleSubCoordinator = isSubCoordinator('enviar');
const isModuleTreasurer = isTreasurer('enviar');
const hasViewStatsAccess = hasAnyRole(ROLE_GROUPS.CAN_VIEW_STATS);
const hasStatsAccess = hasViewStatsAccess || isModuleCoordinator || isModuleSubCoordinator || isModuleTreasurer;
```
- Replace duplicated logic in the "Estadísticas" and "Personas sin Célula" tabs with `hasStatsAccess`.
- Pass `treasurer` prop to `CoordinatorDisplay` when rendering.
- Ensure `moduleTreasurer` state is populated from `/roles` endpoint (already exists).

---

### Client – Coordinator Prop Update

#### [MODIFY] `client/src/components/Enviar.jsx`
- Update `<CoordinatorDisplay />` JSX to include `treasurer={moduleTreasurer}` (prop optional).

---

### Client – Module Pages Alignment

#### [MODIFY] `client/src/components/Ganar.jsx` and `Consolidar.jsx`
- Change API calls to use the unified endpoint `GET /coordinators/module/:module/roles`.
- Add `refreshKey` (or equivalent) to the `useEffect` dependency array to trigger re‑fetch after assignments.
- Standardize the `useAuth` import to `'../context/AuthContext'` (or whichever is the project convention).

---

### Client – CellManagement Fix

#### [MODIFY] `client/src/components/CellManagement.jsx`
- Add error handling for the save API call.
- Show a toast (`toast.success` / `toast.error`) on success or failure.
- Ensure the modal closes only after a successful response.
- Verify that form state is reset after save.

---

## Verification Plan

### Automated Tests
- Run `pnpm run test:run` to execute existing Cypress tests.
- Add new unit tests for the refactored access‑check logic (if time permits).

### Manual Verification
- Launch the dev server (`pnpm start`).
- Verify that the "Estadísticas" and "Personas sin Célula" tabs respect the same access rules.
- Confirm the `treasurer` information appears correctly in the UI.
- Test role assignments in `Ganar` and `Consolidar` modules and ensure the UI refreshes.
- Verify that database queries no longer perform full table scans (use PostgreSQL EXPLAIN if needed).
- Confirm that creating a cell via `CellManagement` now shows success/failure feedback and actually persists data.

---

*Please review the plan and answer the open questions above. Once approved, we will proceed with the implementation.*
