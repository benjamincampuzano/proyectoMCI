# Informe Técnico de Observaciones

> **Fecha:** 25/05/2026
> **Alcance:** Módulo Enviar (frontend) y PostgreSQL (rendimiento)
> **Tipo:** Análisis de código, bugs, refactoring y performance

---

## Índice

1. [Módulo Enviar — Análisis de Código](#1-módulo-enviar--análisis-de-código)
   - [1.1 Variable/Import no usado](#11-variableimport-no-usado)
   - [1.2 Bug crítico: remontado de CellManagement en cada render](#12-bug-crítico-remontado-de-cellmanagement-en-cada-render)
   - [1.3 Consultas API duplicadas e ineficientes](#13-consultas-api-duplicadas-e-ineficientes)
   - [1.4 useEffect no responde al botón de refrescar](#14-useeffect-no-responde-al-botón-de-refrescar)
   - [1.5 canManageCells usa localStorage en vez de useAuth](#15-canmanagecells-usa-localstorage-en-vez-de-useauth)
   - [1.6 Roles DISCIPULO con acceso inconsistente entre pestañas](#16-roles-discipulo-con-acceso-inconsistente-entre-pestañas)
   - [1.7 customCheck duplicado en stats y unassigned](#17-customcheck-duplicado-en-stats-y-unassigned)
   - [1.8 CoordinatorDisplay sin treasurer](#18-coordinatordisplay-sin-treasurer)
   - [1.9 Inconsistencias contra otros módulos](#19-inconsistencias-contra-otros-módulos)
2. [Cambios Aplicados a Enviar.jsx](#2-cambios-aplicados-a-enviarjsx)
   - [2.1 Endpoint consolidado /roles](#21-endpoint-consolidado-roles)
   - [2.2 Botón refresh funcional](#22-botón-refresh-funcional)
   - [2.3 Loading state](#23-loading-state)
   - [2.4 Eliminada variable muerta ROLES](#24-eliminada-variable-muerta-roles)
   - [2.5 Custom checks refactorizados](#25-custom-checks-refactorizados)
   - [2.6 Bug inline arrow corregido](#26-bug-inline-arrow-corregido)
   - [2.7 Treasurer añadido a CoordinatorDisplay](#27-treasurer-añadido-a-coordinatordisplay)
3. [PostgreSQL — Consumo de RAM y Disco](#3-postgresql--consumo-de-ram-y-disco)
   - [3.1 ORDER BY profile.fullName sin índice](#31-order-by-profilefullname-sin-índice)
   - [3.2 WHERE profile.network = X sin índice](#32-where-profilenetwork--x-sin-índice)
   - [3.3 Soft delete acumula filas muertas sin índice compuesto](#33-soft-delete-acumula-filas-muertas-sin-índice-compuesto)
   - [3.4 Cartesian joins ocultos por includes anidados](#34-cartesian-joins-ocultos-por-includes-anidados)
   - [3.5 Consultas redundantes de network por request](#35-consultas-redundantes-de-network-por-request)
   - [3.6 N+1 en audit logs](#36-n1-en-audit-logs)
   - [3.7 Tablas involucradas y su estado actual](#37-tablas-involucradas-y-su-estado-actual)
   - [3.8 Resumen de acciones correctivas](#38-resumen-de-acciones-correctivas)

---

## 1. Módulo Enviar — Análisis de Código

### 1.1 Variable/Import no usado

| Hallazgo | Archivo | Línea | Detalle |
|----------|---------|-------|---------|
| `ROLES` importado pero nunca usado | `Enviar.jsx` | 7 | Solo se usa `ROLE_GROUPS`. `ROLES` es código muerto. Mismo patrón en `Consolidar.jsx`. |

### 1.2 Bug crítico: remontado de CellManagement en cada render

**Archivo:** `client/src/pages/Enviar.jsx` — Línea 80 (original)

```jsx
component: (props) => <CellManagement {...props} moduleCoordinator={moduleCoordinator} />, // INLINE ARROW
```

**Problema:** El tab de "Células" usa una arrow function inline como componente. Como el array `tabs` se crea en el cuerpo del componente (sin memoización), **cada render de `Enviar` crea una nueva referencia de función**. React interpreta que es un tipo de componente diferente y:

- **Desmonta y remonta** `CellManagement` completo en cada render del padre
- **Pérdida total del estado interno**: formularios, selecciones, datos del mapa, etc.
- Las otras pestañas (`attendance`, `stats`, `unassigned`) usan referencias directas — no tienen este problema

**Los otros módulos no tienen este problema:** `Discipular.jsx`, `Ganar.jsx`, `Consolidar.jsx` pasan componentes como referencias directas.

### 1.3 Consultas API duplicadas e ineficientes

| Problema | Líneas | Detalle |
|----------|--------|---------|
| 3 llamadas API separadas | 34, 40, 62 | `GET /coordinators/module/enviar` + fallback a `GET /coordinators?module=enviar` + `GET /coordinators/module/enviar/subcoordinator` |
| Ya existe endpoint consolidado | — | `GET /coordinators/module/:module/roles` devuelve coordinator + subCoordinator + treasurer en **una sola llamada** |
| `Discipular.jsx` ya lo usa correctamente | — | Usa el endpoint consolidado con 1 sola llamada |

### 1.4 useEffect no responde al botón de refrescar

**Archivo:** `Enviar.jsx` — Línea 78 (original)

```jsx
useEffect(() => { ... }, []); // dependencia vacía
```

El estado `refreshTrigger` existe y se pasa a `TabNavigator`, pero **no está en las dependencias del efecto**. Hacer clic en "Actualizar" solo refresca componentes hijos, no los datos del coordinador. `Discipular.jsx` lo tiene correcto con `[refreshKey]`.

### 1.5 canManageCells usa localStorage en vez de useAuth

**Archivo:** `client/src/components/CellManagement.jsx` — Línea 34

```jsx
moduleCoordinator.id === JSON.parse(localStorage.getItem('user') || '{}').id
```

**Problema:** Usa `localStorage` en vez del contexto de autenticación. Si `localStorage` está corrupto o desactualizado, la comparación falla. Debería usar `user.id` desde `useAuth()`.

### 1.6 Roles DISCIPULO con acceso inconsistente entre pestañas

| Pestaña | Línea | Acceso DISCIPULO | Consistente |
|---------|-------|------------------|-------------|
| Células | 26 | ✅ Sí (solo lectura) | Puede ver datos de su célula |
| Reporte de Asistencia | 89 | ✅ Sí | ❌ Inconsistente: stats y unassigned NO lo permiten |
| Estadísticas | 98 | ❌ No | |
| Personas sin Célula | 110 | ❌ No | |

Si `DISCIPULO` no debe ver reportes de asistencia de otras células, hay que eliminar el chequeo en línea 89.

### 1.7 customCheck duplicado en stats y unassigned

**Archivo:** `Enviar.jsx` — Líneas 97-115 (original)

Stats y Unassigned tenían exactamente la misma lógica de acceso:
```jsx
hasRoleAccess || isCoordinator('enviar') || isSubCoordinator('enviar') || isTreasurer('enviar')
```

Si requieren distintos niveles de acceso, necesitan lógica separada.

### 1.8 CoordinatorDisplay sin treasurer

**Archivo:** `Enviar.jsx` — Líneas 126-131 (original)

Se pasaba `coordinator` y `subCoordinator`, pero no `treasurer`. El componente acepta el prop (opcional), pero en el módulo existe lógica de tesorero (`isTreasurer('enviar')` en stats y unassigned).

### 1.9 Inconsistencias contra otros módulos

| Aspecto | Enviar | Ganar | Consolidar | Discipular |
|---------|--------|-------|------------|------------|
| API calls | 3 separadas | 3 separadas | 3 separadas | **1 consolidada** |
| Tab component refs | **Inline arrow (bug)** | Directas | Directas | Directas |
| Refresh button | Usa `<Button>` | Raw `<button>` | Raw `<button>` | Usa `<Button>` |
| useEffect re-fetch | ❌ No | ❌ No | ❌ No | ✅ Sí |
| useAuth import | `'../context/AuthContext'` | `'../hooks/useAuth'` | `'../context/AuthContext'` | `'../context/AuthContext'` |

---

## 2. Cambios Aplicados a Enviar.jsx

Los siguientes cambios fueron implementados en `client/src/pages/Enviar.jsx`:

### 2.1 Endpoint consolidado /roles

**Antes:** 3 llamadas separadas:
- `GET /coordinators/module/enviar` + fallback a `GET /coordinators?module=enviar`
- `GET /coordinators/module/enviar/subcoordinator`

**Después:** 1 llamada:
```jsx
const res = await api.get('/coordinators/module/enviar/roles');
// res.data = { coordinator, subCoordinator, treasurer }
```

### 2.2 Botón refresh funcional

**Antes:** `useEffect` con `[]` — nunca re-fetch. El botón solo incrementaba `refreshTrigger` para hijos.

**Después:** `useEffect` con `[refreshTrigger]` — cada clic recarga coordinadores. El botón solo incrementa el trigger:
```jsx
onClick={() => setRefreshTrigger(prev => prev + 1)}
```

### 2.3 Loading state

Se agregó estado `loading` que muestra un spinner animado en el header mientras se realiza el fetch:
```jsx
const [loading, setLoading] = useState(false);
// ...
{loading ? (
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
) : (
    <CoordinatorDisplay ... />
)}
```

### 2.4 Eliminada variable muerta ROLES

```diff
- import { ROLES, ROLE_GROUPS } from '../constants/roles';
+ import { ROLE_GROUPS } from '../constants/roles';
```

### 2.5 Custom checks refactorizados

Se precomputan los valores de rol al inicio y se reusan entre las funciones de chequeo, eliminando llamadas redundantes a `isCoordinator()`, `isSubCoordinator()`, `isTreasurer()` y `hasAnyRole()` en cada render:

```jsx
const isModuleCoordinator = isCoordinator('enviar');
const isModuleSubCoordinator = isSubCoordinator('enviar');
const isModuleTreasurer = isTreasurer('enviar');
const hasViewStatsAccess = hasAnyRole(ROLE_GROUPS.CAN_VIEW_STATS);

// Stats y Unassigned ahora comparten el mismo customCheck
const hasStatsAccess = () => {
    return hasViewStatsAccess || isModuleCoordinator || isModuleSubCoordinator || isModuleTreasurer;
};
```

### 2.6 Bug inline arrow corregido

**Antes:**
```jsx
component: (props) => <CellManagement {...props} moduleCoordinator={moduleCoordinator} />,
```

**Después:**
```jsx
component: CellManagement,  // referencia directa
```

`moduleCoordinator` se pasa ahora via `componentProps` del `TabNavigator`:
```jsx
<TabNavigator
    componentProps={{ moduleCoordinator }}
    ...
/>
```

### 2.7 Treasurer añadido a CoordinatorDisplay

Se agregó el nuevo estado `moduleTreasurer` y se pasa al `CoordinatorDisplay`, siguiendo el patrón de `Discipular.jsx`:
```jsx
<CoordinatorDisplay
    coordinator={moduleCoordinator}
    subCoordinator={moduleSubCoordinator}
    treasurer={moduleTreasurer}
    moduleName="Enviar"
/>
```

---

## 3. PostgreSQL — Consumo de RAM y Disco

### 3.1 ORDER BY profile.fullName sin índice

**Impacto:** 🔴 Alto

**Archivo:** `server/controllers/coordinatorController.js`

Las funciones `getModuleCoordinators`, `getAllSubCoordinators` y `getAllTreasurers` ordenan por `profile.fullName`:

```javascript
orderBy: { profile: { fullName: 'asc' } }
```

**Problema:** No hay ningún índice en `UserProfile.fullName`. PostgreSQL se ve forzado a hacer **filesort en disco** — materializa todo el set de resultados en archivos temporales. Esto explica el spike de RAM y disco simultáneo.

**Solución:** Agregar índice en `schema.prisma`:
```prisma
model UserProfile {
  // ...
  @@index([fullName])
}
```

### 3.2 WHERE profile.network = X sin índice

**Impacto:** 🔴 Alto

**Archivo:** `server/controllers/coordinatorController.js`

**7 funciones** filtran por `profile.network` para verificar que el usuario pertenezca a la misma red:

```javascript
where: { isDeleted: false, profile: { network: userNetwork } }
```

**Problema:** Sin índice en `UserProfile.network`, PostgreSQL hace **sequential scan** sobre toda la tabla `UserProfile`. Al crecer la tabla, ya no cabe en shared buffers → lectura de disco en cada consulta.

**Funciones afectadas:**
- `getModuleCoordinators` (línea 57)
- `assignModuleCoordinator` (línea 218)
- `assignModuleSubCoordinator` (línea 418)
- `assignModuleTreasurer` (línea 827)
- `getAllSubCoordinators` (línea 1019)
- `getAllTreasurers` (línea 1080)
- `getUserNetworkId` en `coordinatorAuth.js` (línea 188)

**Solución:** Agregar índice en `schema.prisma`:
```prisma
model UserProfile {
  // ...
  @@index([network])
}
```

### 3.3 Soft delete acumula filas muertas sin índice compuesto

**Impacto:** 🔴 Alto

**Migración:** `20260404142528_add_secutity_test`

Esta migración:
1. Eliminó las constraints únicas de `(userId, moduleName)` en las 3 tablas de módulo
2. Agregó columnas `isDeleted` y `deletedAt`
3. Permitió múltiples registros históricos por usuario + módulo

**Problema:** Cada query filtra `WHERE moduleName = X AND isDeleted = false` pero solo hay índice en `moduleName` solo. PostgreSQL escanea por `moduleName` y luego filtra `isDeleted` en memoria. Las filas soft-deleted se acumulan sin límite.

**Tablas afectadas:**
- `ModuleCoordinator`
- `ModuleSubCoordinator`  
- `ModuleTreasurer`

**Solución:** Agregar índices compuestos:
```prisma
model ModuleCoordinator {
  // ...
  @@index([moduleName, isDeleted])
}
// Igual para ModuleSubCoordinator y ModuleTreasurer
```

O mejor aún, **índices parciales**:
```sql
CREATE INDEX idx_module_coordinator_active 
ON "ModuleCoordinator" ("moduleName") 
WHERE "isDeleted" = false;
```

### 3.4 Cartesian joins ocultos por includes anidados

**Impacto:** 🟡 Medio

**Archivo:** `server/controllers/coordinatorController.js`

En `getModuleCoordinators`, `getAllSubCoordinators`, `getAllTreasurers`:

```javascript
select: {
    profile: { ... },            // 1:1
    roles: { include: { ... } }, // 1:N — multiplica filas
    moduleCoordinations: {...}   // 1:N — multiplica más
}
```

Cuando un usuario tiene 3 roles y 2 coordinaciones, Prisma genera SQL con **3 × 2 = 6 filas intermedias** por usuario, que luego deduplica en cliente. Memoria desperdiciada en PostgreSQL y en Prisma.

**Solución:** Separar en consultas independientes:
```javascript
const users = await prisma.user.findMany({ where: ..., select: { profile: ..., roles: ... } });
const coords = await prisma.moduleCoordinator.findMany({ where: ... });
// Combinar en memoria
```

### 3.5 Consultas redundantes de network por request

**Impacto:** 🟡 Medio

El mismo usuario loggeado se consulta **7+ veces** en un mismo request:
```javascript
prisma.user.findUnique({
    where: { id: req.user.id },
    include: { profile: { select: { network: true } } }
});
```

La network del usuario no cambia durante un request. Debería obtenerse **una vez** y cachearse en `req.userNetwork`.

**Funciones con el patrón:**
- `getModuleCoordinators`
- `assignModuleCoordinator`
- `assignModuleSubCoordinator`
- `assignModuleTreasurer`
- `getAllSubCoordinators`
- `getAllTreasurers`
- `getUserNetworkId` (middleware)

**Solución:** Middleware que cargue la red una vez al inicio:
```javascript
// En middleware de autenticación
req.userNetwork = await getUserNetwork(req.user.id);
// Luego en cada controlador: usar req.userNetwork en vez de re-consultar
```

### 3.6 N+1 en audit logs

**Impacto:** 🟢 Bajo, pero empeora con el tiempo

En 6 funciones de asignación/remoción hay un patrón N+1:
```javascript
for (const old of oldRecords) {
    await prisma.auditLog.create({ ... }); // N queries secuenciales
}
```

**Solución:** Usar `createMany`:
```javascript
await prisma.auditLog.createMany({
    data: oldRecords.map(old => ({ ... }) )
});
```

### 3.7 Tablas involucradas y su estado actual

| Tabla | Índices existentes | Índices faltantes | Crecimiento |
|-------|-------------------|-------------------|-------------|
| `UserProfile` | `userId` (unique), `(documentType, documentNumber)` (unique) | `fullName`, `network` | Lineal con usuarios |
| `ModuleCoordinator` | `(userId, moduleName)`, `moduleName` | `(moduleName, isDeleted)` parcial | Acumula soft-deletes |
| `ModuleSubCoordinator` | `(userId, moduleName)`, `moduleName`, `coordinatorId` | `(moduleName, isDeleted)` parcial | Acumula soft-deletes |
| `ModuleTreasurer` | `(userId, moduleName)`, `moduleName` | `(moduleName, isDeleted)` parcial | Acumula soft-deletes |

### 3.8 Resumen de acciones correctivas

| Prioridad | Acción | Archivo/Dependencia | Impacto esperado |
|-----------|--------|---------------------|------------------|
| 🔴 Crítica | Agregar índice `(fullName)` en `UserProfile` | `schema.prisma` + migrate | Elimina filesort en disco |
| 🔴 Crítica | Agregar índice `(network)` en `UserProfile` | `schema.prisma` + migrate | Elimina sequential scans |
| 🔴 Crítica | Agregar índices compuestos `(moduleName, isDeleted)` en 3 tablas | `schema.prisma` + migrate | Elimina filtros post-scan |
| 🟡 Alta | Cachear `userNetwork` en el request (middleware) | `coordinatorAuth.js` | Reduce 7+ queries a 1 |
| 🟡 Alta | Separar queries de listado para evitar Cartesian joins | `coordinatorController.js` | Reduce memoria en Prisma y PG |
| 🟢 Media | Reemplazar loops de `auditLog.create()` con `createMany` | `coordinatorController.js` | Reduce N+1 writes |
| 🟢 Media | Programar limpieza periódica de soft-deletes | Job externo o migración | Controla crecimiento de tablas |

---

## Historial de Cambios

| Fecha | Versión | Descripción | Autor |
|-------|---------|-------------|-------|
| 25/05/2026 | 1.0 | Documento inicial con análisis de Enviar.jsx y PostgreSQL | — |
