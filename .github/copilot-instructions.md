# Copilot Instructions for Proyecto_Iglesia

This file helps future Copilot sessions work effectively in this repository. Keep it concise and focused on repository-specific commands, architecture, and conventions.

## Build / Run / Test / Lint Commands
- Start both dev servers (client + server):
  - npm start
- Start only server:
  - npm run server    # runs: cd server && npm start
- Start only client (dev):
  - npm run client    # runs: cd client && npm run dev
- Install all dependencies (root orchestrates client + server installs):
  - npm run install:all
- Client build and lint:
  - cd client && npm run build
  - cd client && npm run lint
- DB and utility scripts (root):
  - npm run backup
  - npm run restore
  - npm run create-test-users
  - npm run delete-test-users

### Tests (Cypress)
- Open interactive Cypress GUI:
  - npm run test:open
- Run full Cypress suite:
  - npm run test:run
- Run a single Cypress spec (example):
  - npx cypress run --spec "cypress/e2e/path/to/spec.cy.{js,ts}"
  - or from root: npm run test:run -- --spec "cypress/e2e/path/to/spec.cy.{js,ts}"

## High-level Architecture (big picture)
- Monorepo with two main workspaces:
  - client/: React + Vite frontend (ESM, Tailwind, Recharts, React-Leaflet)
  - server/: Node.js + Express API backed by PostgreSQL via Supabase
- Root package.json provides convenience scripts that orchestrate client and server (uses `concurrently`).
- Auth and data layer:
  - Authentication uses JWT and bcrypt server-side; data persisted in Supabase/Postgres.
- Scripts/: utilities for DB backup/restore and user management; useful for CI or local maintenance.
- Ports (defaults referenced in README): frontend on 5173, backend on 5000. Client expects an API URL configured via environment variables.

## Key Conventions (repo-specific)
- Environment files:
  - server/.env must contain Supabase credentials and DB connection variables.
  - client/.env should include the API base URL for the frontend to call the backend.
- Roles and permission groups are central to behavior; see README for role constants (ADMIN, PASTOR, LIDER_DOCE, LIDER_CELULA, DISCIPULO). Copilot should prefer these constants when suggesting auth/permission code.
- Client structure:
  - src/components: reusable UI components
  - src/pages: route-level pages
  - src/context and src/hooks: centralized state & side-effect logic — prefer reusing context/hooks rather than ad-hoc prop drilling.
- Server structure:
  - controllers/, routes/, middleware/, models/ — follow existing patterns for route handlers (controllers) and keep business logic out of route definitions.
- Scripts naming:
  - Root npm scripts call into scripts/ for DB and test user management. Use these rather than duplicating logic.
- Testing:
  - E2E tests use Cypress. Do not assume unit tests exist — add new test types under a clear folder structure (e.g., cypress/e2e/) and update package.json scripts accordingly.
- Commit message trailer:
  - When creating commits via automation (scripts/CI) include the required Co-authored-by trailer: `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`

## Other repository docs to reference
- README.md: module descriptions, scripts, install and run instructions
- DESIGN.md and module-specific Informe_*.md files: domain rules and module requirements
- client/LOGGING.md and scripts/README*.md: client logging and maintenance scripts

## Notes for Copilot sessions
- Prefer minimal, focused suggestions that match project scripts and folder layout (do not propose unrelated tooling).
- When suggesting new scripts or config files, prefer editing client/package.json or server/package.json rather than adding redundant root-level scripts.
- For environment-sensitive suggestions, remind the user to add server/.env and client/.env.

---

If this file already exists, consider merging content rather than replacing it entirely.
