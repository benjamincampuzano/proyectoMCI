# Informe del Módulo Consolidar

## 1. Descripción General del Módulo

El módulo **Consolidar** es responsable de la gestión integral del seguimiento de invitados, la asistencia a la iglesia y las estadísticas relacionadas. Este módulo permite:

- El registro y seguimiento de invitados (integrado desde el módulo Ganar)
- La gestión de asistencia a servicios de la iglesia
- La visualización de estadísticas de asistencia
- El seguimiento del estado de consolidación de invitados

### Componentes Principales

| Componente | Archivo | Función |
|------------|---------|---------|
| Consolidar.jsx | `client/src/pages/Consolidar.jsx` | Página principal con navegación por pestañas |
| ChurchAttendance.jsx | `client/src/components/ChurchAttendance.jsx` | Registro de asistencia a la iglesia |
| ChurchAttendanceChart.jsx | `client/src/components/ChurchAttendanceChart.jsx` | Gráficos y estadísticas de asistencia |
| GuestTracking.jsx | `client/src/components/GuestTracking.jsx` | Sistema de seguimiento de invitados |
| GuestTrackingStats.jsx | `client/src/components/GuestTrackingStats.jsx` | Estadísticas de seguimiento de invitados |

---

## 2. Estructura de Roles

El sistema define cinco roles principales definidos en `client/src/constants/roles.js`:

| Rol | Identificador | Descripción |
|-----|---------------|-------------|
| Administrador | `ADMIN` | Control total del sistema |
| Pastor | `PASTOR` | Liderazgo pastoral |
| Líder de 12 | `LIDER_DOCE` | Coordinador de red de células |
| Líder de Célula | `LIDER_CELULA` | Líder de célula grupal |
| Discípulo | `DISCIPULO` | Miembro en proceso de formación |

### Grupos de Roles Aplicables al Módulo

```javascript
ALL_LEADERS: [ADMIN, PASTOR, LIDER_DOCE, LIDER_CELULA]
CAN_VIEW_STATS: [ADMIN, PASTOR, LIDER_DOCE, LIDER_CELULA]
```

---

## 3. Permisos por Rol en el Módulo Consolidar

### 3.1 ADMIN - Administrador

| Función | Permiso |
|---------|---------|
| Registrar asistencia a la iglesia | ✓ |
| Eliminar registros de asistencia | ✓ |
| Ver estadísticas de asistencia | ✓ |
| Gestionar seguimiento de invitados | ✓ |
| Ver estadísticas de seguimiento | ✓ |
| Gestionar coordinadores del módulo | ✓ |
| Gestionar subcoordinadores del módulo | ✓ |

### 3.2 PASTOR - Pastor

| Función | Permiso |
|---------|---------|
| Registrar asistencia a la iglesia | ✓ |
| Eliminar registros de asistencia | ✓ |
| Ver estadísticas de asistencia | ✓ |
| Gestionar seguimiento de invitados | ✓ |
| Ver estadísticas de seguimiento | ✓ |
| Gestionar coordinadores del módulo | ✓ |
| Gestionar subcoordinadores del módulo | ✓ |

### 3.3 LIDER_DOCE - Líder de 12

| Función | Permiso |
|---------|---------|
| Registrar asistencia a la iglesia | ✓ |
| Ver estadísticas de asistencia | ✓ |
| Gestionar seguimiento de invitados | ✓ |
| Ver estadísticas de seguimiento | ✓ |
| Ser coordinador de módulo | ✓ |
| Ser subcoordinador de módulo | ✓ |

### 3.4 LIDER_CELULA - Líder de Célula

| Función | Permiso |
|---------|---------|
| Registrar asistencia a la iglesia | ✓ |
| Ver estadísticas de asistencia | ✓ |
| Gestionar seguimiento de invitados | ✓ |
| Ver estadísticas de seguimiento | ✓ |

### 3.5 DISCIPULO - Discípulo

| Función | Permiso |
|---------|---------|
| Registrar asistencia a la iglesia | ✓ |
| Ver estadísticas de asistencia | ✗ |
| Gestionar seguimiento de invitados | ✗ |
| Ver estadísticas de seguimiento | ✗ |

---

## 4. Sistema de Coordinadores del Módulo

### 4.1 Coordinador del Módulo (CoordinatorSelector)

- **Identificación**: Campo `moduleCoordinator` en estado local
- **Endpoint**: `/coordinators/module/consolidar`
- **Fallback**: `/coordinators` con filtro por módulo
- **Permiso de modificación**: Solo ADMIN y PASTOR

### 4.2 Subcoordinador del Módulo (SubCoordinatorSelector)

- **Identificación**: Campo `moduleSubCoordinator` en estado local
- **Endpoint**: `/coordinators/module/consolidar/subcoordinator`
- **Permiso de modificación**: Solo ADMIN y PASTOR
- **Condición adicional**: También accesible para usuarios con `isCoordinator` o que sean coordinadores de algún módulo

---

## 5. Pestañas del Módulo Consolidar

| ID Pestaña | Nombre | Componente | Roles con Acceso |
|------------|--------|------------|------------------|
| attendance | Asistencia a la Iglesia | ChurchAttendance | Todos los usuarios autenticados |
| stats | Estadísticas de Asistencia | ChurchAttendanceChart | ALL_LEADERS |

---

## 6. Características de ChurchAttendance

### 6.1 Registro de Asistencia

El componente de asistencia a la iglesia permite:

- **Selección de fecha**: Selector de fecha para registrar asistencia de un día específico
- **Lista de miembros**: Visualización de todos los miembros registrados
- **Estados de asistencia**: 
  - PRESENTE (Asistió)
  - AUSENTE (No asistió)
  - JUSTIFICADO (Justificado)
  - EN_LINEA (Asistió en línea)

### 6.2 Endpoints Utilizados

- `GET /consolidar/church-attendance/members/all` - Obtener lista de miembros
- `GET /consolidar/church-attendance/:date` - Obtener asistencia de una fecha
- `POST /consolidar/church-attendance` - Guardar asistencia
- `DELETE /consolidar/church-attendance/:date` - Eliminar asistencia de una fecha

---

## 7. Estados de Seguimiento de Invitados

El sistema de seguimiento de invitados (GuestTracking) utiliza los siguientes estados:

| Estado | Descripción |
|--------|-------------|
| NUEVO | Invitado recién registrado |
| CONTACTADO | Ha sido contactado para seguimiento |
| CONSOLIDADO | Ha sido visitado/consolidado |
| GANADO | Se ha convertido en miembro/discípulo |

---

## 8. Dependencias y Recursos

### Endpoints del Servidor Relacionados

- `/consolidar/church-attendance/*` - Gestión de asistencia a la iglesia
- `/guests/*` - Gestión de invitados (compartido con módulo Ganar)

### Hooks Personalizados

- `useGuestManagement`: Hook para gestión de invitados (compartido)

### Bibliotecas Externas

- `phosphor-icons`: Iconos del sistema

---

## 9. Información del Proyecto

| Atributo | Valor |
|----------|-------|
| Nombre del Proyecto | Proyecto_Iglesia |
| Módulo | Consolidar (Seguimiento e Iglesia) |
| Tecnologías Frontend | React + Vite |
| Estilo de Componentes | Phosphor Icons |
| Gestión de Estado | React Hooks (useState, useEffect, useMemo) |
| Integración | Comparte componentes con módulo Ganar |