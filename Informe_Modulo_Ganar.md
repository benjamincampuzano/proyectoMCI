# Informe del Módulo Ganar

## 1. Descripción General del Módulo

El módulo **Ganar** es responsable de la gestión integral del registro y seguimiento de invitados de la iglesia. Este módulo permite:

- El registro de nuevos invitados tanto de forma pública como interna
- El seguimiento del estado de cada invitado (Nuevo, Contactado, Consolidado, Ganado)
- La conversión de invitados a miembros del sistema
- La gestión de la oración de tres
- Visualización de estadísticas del módulo
- Asignación de responsables para el seguimiento de invitados

### Componentes Principales

| Componente | Archivo | Función |
|------------|---------|---------|
| Ganar.jsx | `client/src/pages/Ganar.jsx` | Página principal con navegación por pestañas |
| PublicGuestRegistration.jsx | `client/src/pages/PublicGuestRegistration.jsx` | Formulario público de auto-registro para invitados |
| GuestRegistrationForm.jsx | `client/src/components/GuestRegistrationForm.jsx` | Formulario interno para registro por líderes |
| GuestList.jsx | `client/src/components/GuestList.jsx` | Lista de invitados con filtros y gestión |
| GuestTracking.jsx | `client/src/components/GuestTracking.jsx` | Sistema de seguimiento de invitados |
| GuestStats.jsx | `client/src/components/GuestStats.jsx` | Reportes estadísticos del módulo |
| OracionDeTresManagement.jsx | `client/src/components/OracionDeTresManagement.jsx` | Gestión de oración de tres |

---

## 2. Estructura de Roles

El sistema define cinco roles principales definidos en `client/src/constants/roles.js`:

| Rol | Identificador | Descripción |
|-----|---------------|-------------|
| Administrador | `ADMIN` | Control total del sistema |
| Pastor | `PASTOR` | Liderazgo pastoral |
| Líder de 12 | `LIDER_DOCE` | Coordinador de red de células |
| Líder de Célula | `LIDER_CELULA` | Lider de célula grupal |
| Discípulo | `DISCIPULO` | Miembro en proceso de formación |

### Grupos de Roles Definidos

```javascript
ALL_LEADERS: [ADMIN, PASTOR, LIDER_DOCE, LIDER_CELULA]
CAN_MANAGE_USERS: [ADMIN, PASTOR, LIDER_DOCE]
CAN_VIEW_STATS: [ADMIN, PASTOR, LIDER_DOCE, LIDER_CELULA]
CAN_MANAGE_CELLS: [ADMIN, PASTOR, LIDER_DOCE]
CAN_MANAGE_GOALS: [ADMIN, PASTOR]
CAN_MANAGE_CLASSES: [ADMIN, LIDER_DOCE, LIDER_CELULA, DISCIPULO]
```

---

## 3. Permisos por Rol en el Módulo Ganar

### 3.1 ADMIN - Administrador

| Función | Permiso |
|---------|---------|
| Registrar nuevos invitados | ✓ |
| Editar cualquier campo de invitado | ✓ |
| Eliminar invitados del sistema | ✓ |
| Convertir Guest a Miembro | ✓ |
| Visualizar estadísticas | ✓ |
| Gestionar oración de tres | ✓ |
| Gestionar coordinadores del módulo | ✓ |
| Asignar responsable distinto al invitador | ✓ |

### 3.2 PASTOR - Pastor

| Función | Permiso |
|---------|---------|
| Registrar nuevos invitados | ✗ (deshabilitado) |
| Visualizar lista de invitados de su red | ✓ |
| Visualizar estadísticas | ✓ |
| Gestionar oración de tres | ✓ |
| Gestionar coordinadores del módulo | ✓ |

**Nota**: Los pastors ven un mensaje informativo indicando que no pueden crear invitados directamente. Los invitados deben ser creados por LIDER_DOCE, LIDER_CELULA o DISCIPULO.

### 3.3 LIDER_DOCE - Líder de 12

| Función | Permiso |
|---------|---------|
| Registrar nuevos invitados | ✓ |
| Editar cualquier campo de invitado | ✓ |
| Eliminar invitados del sistema | ✓ |
| Convertir Guest a Miembro | ✓ |
| Asignar responsable | Puede asignar a DISCIPULOS y LIDER_CELULA de su red |
| Visualizar estadísticas | ✓ |
| Gestionar oración de tres | ✓ |
| Ser coordinador de módulo | ✓ |

### 3.4 LIDER_CELULA - Líder de Célula

| Función | Permiso |
|---------|---------|
| Registrar nuevos invitados | ✓ |
| Editar campos de invitado | Limitado |
| Eliminar invitados del sistema | ✗ |
| Convertir Guest a Miembro | ✗ |
| Asignar responsable | Solo puede asignar a sus DISCIPULOS |
| Visualizar estadísticas | ✓ |
| Gestionar oración de tres | ✓ |

### 3.5 DISCIPULO - Discípulo

| Función | Permiso |
|---------|---------|
| Registrar nuevos invitados | ✓ |
| Editar campos de invitado | Limitado |
| Eliminar invitados del sistema | ✗ |
| Convertir Guest a Miembro | ✗ |
| Asignar responsable | Solo puede ser auto-asignado |
| Visualizar estadísticas | ✗ |
| Gestionar oración de tres | ✓ |

---

## 4. Sistema de Coordinadores del Módulo

### 4.1 Coordinador del Módulo (CoordinatorSelector)

- **Identificación**: Campo `moduleCoordinator` en estado local
- **Endpoint**: `/coordinators/module/ganar`
- **Fallback**: `/coordinators` con filtro por módulo
- **Permiso de modificación**: Solo ADMIN y PASTOR

### 4.2 Subcoordinador del Módulo (SubCoordinatorSelector)

- **Identificación**: Campo `moduleSubCoordinator` en estado local
- **Endpoint**: `/coordinators/module/ganar/subcoordinator`
- **Permiso de modificación**: ADMIN, PASTOR y usuarios con rol LIDER_DOCE o flag isCoordinator

---

## 5. Pestañas del Módulo Ganar

| ID Pestaña | Nombre | Componente | Roles con Acceso |
|------------|--------|------------|------------------|
| list | Lista de Invitados | GuestList | Todos los usuarios autenticados |
| tracking | Seguimiento de Invitados | GuestTracking | Todos los usuarios autenticados |
| stats | Estadísticas | GuestStats | ALL_LEADERS |
| oracion | Oración de Tres | OracionDeTresManagement | ADMIN, LIDER_DOCE, LIDER_CELULA, DISCIPULO |

---

## 6. Estados de Invitados

Los invitados pueden tener los siguientes estados en su ciclo de vida:

| Estado | Etiqueta UI | Descripción |
|--------|-------------|-------------|
| NUEVO | Nuevo | Invitado recién registrado |
| CONTACTADO | Llamado | Ha sido contactado para seguimiento |
| CONSOLIDADO | Visitado | Ha sido visitado/consolidado |
| GANADO | Consolidado | Se ha convertido en miembro/discípulo |

---

## 7. Flujo de Registro de Invitados

### 7.1 Registro Público (PublicGuestRegistration.jsx)

El formulario público permite a un invitado auto-registrarse seleccionando quién lo invitó. El sistema automáticamente establece:
- `invitedById`: Usuario que lo invitó
- `assignedToId`: Usuario responsable (se establece igual que invitedById por defecto)

### 7.2 Registro Interno (GuestRegistrationForm.jsx)

El formulario interno permite a los líderes registrar invitados con las siguientes características:
- ADMIN y LIDER_DOCE pueden especificar quién invitó al convidado
- La asignación de responsable varía según el rol del usuario que registra

---

## 8. Dependencias y Recursos

### Archivos del Servidor Relacionados

- `server/controllers/guestController.js` - Lógica de gestión de invitados
- `server/routes/guestRoutes.js` - Rutas API de invitados
- `server/controllers/guestTrackingController.js` - Seguimiento de invitados
- `server/controllers/guestStatsController.js` - Estadísticas del módulo

### Hooks Personalizados

- `client/src/hooks/useGuestManagement.js` - Hook para gestión de estado de invitados

---

## 9. Información del Proyecto

| Atributo | Valor |
|----------|-------|
| Nombre del Proyecto | Proyecto_Iglesia |
| Módulo | Ganar |
| Tecnologías Frontend | React + Vite |
| Estilo de Componentes | Phosphor Icons |
| Gestión de Estado | React Context + Hooks personalizados |