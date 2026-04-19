# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build / Run / Test Commands

```bash
# Start both dev servers (client + server)
npm start

# Start only server (port 5000)
npm run server

# Start only client (Vite dev server, port 5173)
npm run client

# Install all dependencies
npm run install:all

# Client build and lint
cd client && npm run build
cd client && npm run lint

# Database migrations (server directory)
npx prisma migrate dev
npx prisma generate

# Cypress tests
npm run test:open    # Interactive GUI
npm run test:run     # Full suite
```

## High-level Architecture

### Monorepo Structure

```
Proyecto_Iglesia/
├── client/          # React + Vite frontend (ESM, Tailwind, Recharts, React-Leaflet)
├── server/          # Node.js + Express API with PostgreSQL via Prisma
├── scripts/         # DB backup/restore and test user utilities
└── .github/         # CI workflows and Copilot instructions
```

### Authentication & Authorization

- **JWT-based auth** with refresh tokens stored in database
- **RBAC system** with 5 roles defined in `client/src/constants/roles.js`:
  - `ADMIN` - Full system control
  - `PASTOR` - Pastoral leadership
  - `LIDER_DOCE` - Cell network coordinator
  - `LIDER_CELULA` - Cell group leader
  - `DISCIPULO` - Member in training

- **Module Coordinators**: Users can be assigned as coordinators for specific modules (Ganar, Discipular, Enviar, Consolidar, Convenciones, Encuentros, Artes) via `ModuleCoordinator` and `ModuleSubCoordinator` tables

### Database Schema (Prisma)

Key entities in `server/prisma/schema.prisma`:
- **User/UserProfile** - Core user data with hierarchical relationships (`UserHierarchy`)
- **Guest** - Visitor tracking with status lifecycle (NUEVO → CONTACTADO → CONSOLIDADO → GANADO)
- **Cell** - Small group meetings with attendance tracking
- **SeminarModule/ClassAttendance** - Discipleship training system
- **Convention/Encuentro** - Events with registrations and payments
- **ArtSchool** - Art classes with enrollments and payments
- **AuditLog** - System-wide audit trail

### Module System

The application is organized into modules matching the church's "MCI" (Modelo de Células con Integración) methodology:

| Module | Purpose | Key Components |
|--------|---------|----------------|
| **Ganar** | Guest registration & tracking | `GuestRegistrationForm`, `GuestList`, `GuestTracking`, `OracionDeTresManagement` |
| **Consolidar** | Church attendance & guest follow-up | `ChurchAttendance`, `ChurchAttendanceChart` |
| **Discipular** | Leadership school management | `CourseManagement`, `StudentMatrix`, `SchoolLeaderStats` |
| **Enviar** | Cell group management | `CellManagement`, `CellAttendance`, attendance maps |
| **Convenciones** | Convention events | Registration, payments, goals |
| **Encuentros** | Encounter events | Similar structure to conventions |
| **Escuela de Artes** | Art school | Classes, enrollments, payments |

### API Structure

Server routes in `server/routes/` map to modules:
- `/api/auth` - JWT login/refresh/logout
- `/api/users` - User CRUD and hierarchy
- `/api/guests` - Guest management
- `/api/consolidar` - Church attendance
- `/api/seminar` - Discipleship modules
- `/api/convenciones` - Convention management
- `/api/encuentros` - Encounter management
- `/api/school` - Art school
- `/api/coordinators` - Module coordinator assignment
- `/api/audit` - Audit logs and database backup/restore

### Frontend Architecture

- **React 18** with functional components and hooks
- **React Router** for navigation
- **Context providers**: `AuthContext`, `ThemeContext`, `LoadingContext`
- **Custom hooks**: `useGuestManagement`, `useCellAttendance`, `useAuditDashboard`
- **UI library**: Phosphor Icons, custom components in `client/src/components/ui/`
- **Styling**: Tailwind CSS v4
- **Design system**: Dark-mode-first theme inspired by Linear (see `DESIGN.md`)

### Key Conventions

- **Environment files**: `server/.env` for Supabase/DB credentials, `client/.env` for API URL
- **Logging**: Frontend uses `client/src/utils/logger.js` to suppress logs in production or via `VITE_DISABLE_LOGS=true`
- **Commit messages**: Include `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` for automated commits
- **Permission checks**: Use `hasAnyRole()` helper with `ROLE_GROUPS` constants rather than hardcoded role arrays

### Repository Documentation

- `DESIGN.md` - Linear-inspired design system with color palette, typography, and component styles
- `Informe_Modulo_*.md` - Module-specific documentation with role permissions and component details
- `.github/copilot-instructions.md` - Additional Copilot guidance
