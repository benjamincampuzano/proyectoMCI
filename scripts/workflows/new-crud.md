---
description: Automate CRUD module creation following project patterns
---

This workflow automates the creation of a new CRUD module following the project's established patterns. It creates:
1. Server controller (`server/controllers/X.js`)
2. Server routes (`server/routes/X.js`)
3. Client modal component (`client/src/components/XModal.jsx`)
4. Client page component (`client/src/pages/X.jsx`)
5. Route registration in `client/src/App.jsx`
6. Route mounting in `server/index.js`

## Usage

Run this workflow and provide the following information:
- **Module name**: The singular name of the resource (e.g., "Guest", "User", "Goal")
- **Route path**: The API route path (e.g., "/api/guests", "/api/users")
- **Client route**: The client-side route path (e.g., "guests", "users")
- **Fields**: Array of field definitions with name, type, and validation rules

## Steps

1. **Ask for module details**
   - Prompt user for module name (PascalCase, singular)
   - Prompt user for API route path (e.g., "/api/guests")
   - Prompt user for client route path (e.g., "guests")
   - Prompt user for required fields with types

2. **Create server controller**
   - Create `server/controllers/{moduleName}Controller.js`
   - Implement standard CRUD operations:
     - `create{ModuleName}` - POST /
     - `getAll{ModuleName}s` - GET / (with pagination, filters)
     - `get{ModuleName}ById` - GET /:id
     - `update{ModuleName}` - PUT /:id
     - `delete{ModuleName}` - DELETE /:id
   - Include authentication middleware checks
   - Add audit logging using `logActivity`
   - Follow existing patterns from `guestController.js`

3. **Create server routes**
   - Create `server/routes/{moduleName}Routes.js`
   - Import controller functions
   - Define Express routes with auth middleware
   - Follow pattern from `guestRoutes.js`

4. **Create client modal component**
   - Create `client/src/components/{ModuleName}Modal.jsx`
   - Implement form with all fields
   - Add validation based on field types
   - Use Modal from `./ui`
   - Include loading states and error handling
   - Follow pattern from `GuestEditModal.jsx`

5. **Create client page component**
   - Create `client/src/pages/{ModuleName}.jsx`
   - Implement list view with table/grid
   - Add create/edit/delete buttons
   - Include pagination
   - Add search/filter functionality
   - Follow pattern from `Ganar.jsx`

6. **Register route in App.jsx**
   - Add lazy import for the new page
   - Add route definition in Routes section
   - Determine appropriate route wrapper (PrivateRoute, AdminRoute, etc.)
   - Follow existing pattern in App.jsx

7. **Mount route in server/index.js**
   - Add route import at top
   - Add `app.use()` call with route path
   - Follow existing pattern in server/index.js

8. **Verify and summarize**
   - List all created files
   - Show code snippets for route registration
   - Remind user to run database migration if needed
   - Remind user to test the new module

## Field Types

Supported field types:
- `string` - Text input
- `number` - Number input
- `email` - Email input with validation
- `tel` - Phone number input
- `date` - Date picker
- `boolean` - Checkbox
- `select` - Dropdown (requires options array)
- `textarea` - Multi-line text input
- `relation` - Async search select (requires fetch function)

## Example Field Definition

```javascript
{
  name: 'name',
  type: 'string',
  required: true,
  label: 'Nombre Completo'
},
{
  name: 'phone',
  type: 'tel',
  required: true,
  label: 'Teléfono'
},
{
  name: 'status',
  type: 'select',
  required: false,
  label: 'Estado',
  options: ['NUEVO', 'CONTACTADO', 'CONSOLIDADO']
}
```

## Notes

- Always use named exports, not default exports
- Follow the project's code style (2 spaces, LF line endings)
- Include prop-types validation for React components
- Use Prisma for database operations
- Add proper error handling with try/catch
- Include audit logging for all mutations
- Use the design system colors from DESIGN.md
