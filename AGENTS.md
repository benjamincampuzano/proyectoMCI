# Agent Guidelines for Proyecto Iglesia

This document provides guidelines for AI agents working on this codebase.

## Project Overview

- **Type**: Congregation CRM Web App (monorepo)
- **Stack**: React 18 + Vite (client), Express + Prisma + PostgreSQL (server)
- **Node**: >=18 required
- **Design System**: Dark-mode-first, Linear-inspired (see DESIGN.md)

## Build/Lint/Test Commands

### Root Commands
```bash
npm start              # Run both client and server concurrently
npm run install:all    # Install all dependencies in root, client, server
npm run test:open      # Open Cypress test runner
npm run test:run       # Run Cypress tests headless
```

### Client (React + Vite)
```bash
cd client
npm run dev            # Development server (localhost:5173)
npm run build          # Production build to dist/
npm run lint           # Run ESLint
npm run lint --fix     # Auto-fix lint issues
```

### Server (Express + Prisma)
```bash
cd server
npm run dev            # Development with nodemon
npm run start          # Production: prisma migrate deploy + node index.js
```

### Running a Single Test (Cypress)
```bash
# Open Cypress UI to select specific test
npm run test:open

# Run specific spec file
npx cypress run --spec "client/tests/test-auth-frontend.js"

# Run tests matching a keyword
npx cypress run --grep "login"
```

## Code Style Guidelines

### Formatting & Layout
- **Indentation**: 2 spaces (no tabs)
- **Line endings**: LF (Unix-style)
- **Max line length**: 100 characters (soft limit)
- **Trailing commas**: Required on multi-line objects/arrays

### React/Component Conventions
- **File naming**: PascalCase for components (`UserProfile.jsx`), camelCase for hooks (`useUserManagement.js`)
- **Component structure**: Props → State → Effects → Handlers → Render
- **Imports order**: 1) React, 2) External libs, 3) Internal components/hooks, 4) Utils/constants
- **Always use**: `prop-types` for component props validation
- **Avoid**: `default exports` - use named exports instead
- **Hooks**: Custom hooks in `client/src/hooks/`, prefixed with `use`

### Server/Express Conventions
- **Controller naming**: `*Controller.js` - one file per resource
- **Route naming**: `*Routes.js` - route definitions
- **Middleware**: `server/middleware/` - auth, RBAC, rate limiting
- **Error handling**: Always wrap async routes with try/catch, use centralized error middleware
- **DB Access**: Use Prisma client from `server/utils/database.js`

### Naming Conventions
- **Variables/Functions**: camelCase (`getUserByEmail`, `isActive`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`, `API_BASE_URL`)
- **Classes/Types**: PascalCase (`UserService`, `AttendanceRecord`)
- **Files**: kebab-case (`user-service.js`, `main-layout.jsx`)
- **Booleans**: Prefix with `is`, `has`, `can`, `should` (`isActive`, `hasPermission`)

### TypeScript/JavaScript Types
- Use JSDoc comments for complex types when not using TypeScript
- Prefer explicit types over `any`
- Create shared types in `client/src/types/` or `server/utils/`

### CSS/Tailwind
- Use Tailwind CSS v4 utility classes (see DESIGN.md for color system)
- Custom colors in `client/src/constants/colors.js`
- Custom animations in `client/src/utils/linearAnimations.js`
- Avoid raw CSS; use Tailwind or inline styles for dynamic values

### Error Handling
- **Frontend**: Use `react-hot-toast` for user feedback (`toast.error()`, `toast.success()`)
- **Backend**: Return proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- **API errors**: Always return `{ error: 'message' }` format
- **Logging**: Use `client/src/utils/logger.js` for frontend, console for server

### Database (Prisma)
- Models in `server/prisma/schema.prisma`
- Never commit secrets - use environment variables (`.env.local`)
- Always use parameterized queries through Prisma

### Security
- Never expose JWT tokens in URLs or logs
- Sanitize user inputs to prevent SQL injection (handled by Prisma)
- Use helmet.js on Express server
- Implement rate limiting on public endpoints

### Git Conventions
- Commit message format: `<type>: <description>` (types: feat, fix, docs, style, refactor, test)
- Branch naming: `feature/description`, `fix/description`, `hotfix/description`
- PR title: Clear description of changes

### Testing
- Test files in `client/tests/` (Cypress)
- Follow existing test patterns in spec files
- Run `npm run test:run` before submitting changes

## Existing Design System

See `DESIGN.md` for complete visual guidelines including:
- Color palette (dark mode: `#08090a`, `#0f1011`, `#191a1b`)
- Typography (Inter Variable with `"cv01", "ss03"` features)
- Component styling (buttons, cards, inputs, badges)
- Spacing system (8px base unit)

Key colors to use:
- Background: `#08090a` (marketing), `#0f1011` (panels), `#191a1b` (elevated)
- Primary text: `#f7f8f8`, Secondary: `#d0d6e0`, Muted: `#8a8f98`
- Accent: `#5e6ad2` (brand), `#7170ff` (violet)
- Border: `rgba(255,255,255,0.08)` (standard), `rgba(255,255,255,0.05)` (subtle)

## Common Tasks

### Adding a new API endpoint
1. Create controller in `server/controllers/`
2. Define route in `server/routes/`
3. Register in `server/index.js`
4. Add auth middleware if needed

### Adding a new component
1. Create in `client/src/components/`
2. Use existing UI primitives from `client/src/components/ui/`
3. Follow color system from DESIGN.md
4. Add prop-types validation

### Database migration
```bash
cd server
npx prisma migrate dev --name migration_name
npx prisma generate
```

## Notes for AI Agents

- This is a church management system - be respectful of the domain
- The codebase uses Spanish language in many user-facing strings
- Supabase Auth is used for authentication
- Real-time features may use Supabase Realtime