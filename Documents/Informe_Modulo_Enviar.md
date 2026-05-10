# Informe del Módulo Enviar

## 1. Descripción General del Módulo

El módulo **Enviar** es responsable de la gestión de las células de la iglesia, incluyendo la creación, edición y seguimiento de células, así como el registro de asistencia y visualización de estadísticas. Este módulo permite:

- La gestión integral de células (crear, editar, eliminar)
- Asignación de líderes y anfitriones a cada célula
- Registro de asistencia de miembros a las reuniones de célula
- Visualización de estadísticas de asistencia
- Ubicación geográfica de células en mapa

### Componentes Principales

| Componente | Archivo | Función |
|------------|---------|---------|
| Enviar.jsx | `client/src/pages/Enviar.jsx` | Página principal con navegación por pestañas |
| CellManagement.jsx | `client/src/components/CellManagement.jsx` | Gestión integral de células |
| CellAttendance.jsx | `client/src/components/CellAttendance.jsx` | Registro de asistencia a células |
| AttendanceChart.jsx | `client/src/components/AttendanceChart.jsx` | Gráficos y estadísticas de asistencia |

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
CAN_MANAGE_CELLS: [ADMIN, PASTOR, LIDER_DOCE]
CAN_VIEW_STATS: [ADMIN, PASTOR, LIDER_DOCE, LIDER_CELULA]
```

---

## 3. Permisos por Rol en el Módulo Enviar

### 3.1 ADMIN - Administrador

| Función | Permiso |
|---------|---------|
| Crear nuevas células | ✓ |
| Editar células existentes | ✓ |
| Eliminar células | ✓ |
| Asignar líder de célula | ✓ |
| Asignar anfitrión | ✓ |
| Asignar Líder de 12 a célula | ✓ |
| Registrar asistencia | ✓ |
| Ver estadísticas | ✓ |
| Gestionar coordinadores del módulo | ✓ |
| Gestionar subcoordinadores del módulo | ✓ |

### 3.2 PASTOR - Pastor

| Función | Permiso |
|---------|---------|
| Crear nuevas células | ✓ |
| Editar células existentes | ✓ |
| Eliminar células | ✓ |
| Asignar líder de célula | ✓ |
| Asignar anfitrión | ✓ |
| Asignar Líder de 12 a célula | ✓ |
| Registrar asistencia | ✓ |
| Ver estadísticas | ✓ |
| Gestionar coordinadores del módulo | ✓ |
| Gestionar subcoordinadores del módulo | ✓ |

### 3.3 LIDER_DOCE - Líder de 12

| Función | Permiso |
|---------|---------|
| Crear nuevas células | ✓ |
| Editar células existentes | ✓ (solo las de su red) |
| Eliminar células | ✓ (solo las de su red) |
| Asignar líder de célula | ✓ |
| Asignar anfitrión | ✓ |
| Asignar Líder de 12 a célula | ✓ (solo para células de su red) |
| Registrar asistencia | ✓ |
| Ver estadísticas | ✓ |
| Ser coordinador de módulo | ✓ |
| Ser subcoordinador de módulo | ✓ |

### 3.4 LIDER_CELULA - Líder de Célula

| Función | Permiso |
|---------|---------|
| Crear nuevas células | ✗ |
| Editar células existentes | ✗ |
| Eliminar células | ✗ |
| Registrar asistencia | ✓ (solo para su célula) |
| Ver estadísticas | ✓ |
| Ver lista de células | ✓ |

### 3.5 DISCIPULO - Discípulo

| Función | Permiso |
|---------|---------|
| Crear nuevas células | ✗ |
| Editar células existentes | ✗ |
| Eliminar células | ✗ |
| Registrar asistencia | ✓ (solo para su célula) |
| Ver estadísticas | ✗ |
| Ver lista de células | ✓ |

---

## 4. Sistema de Coordinadores del Módulo

### 4.1 Coordinador del Módulo (CoordinatorSelector)

- **Identificación**: Campo `moduleCoordinator` en estado local
- **Endpoint**: `/coordinators/module/enviar`
- **Fallback**: `/coordinators` con filtro por módulo
- **Permiso de modificación**: Solo ADMIN y PASTOR

### 4.2 Subcoordinador del Módulo (SubCoordinatorSelector)

- **Identificación**: Campo `moduleSubCoordinator` en estado local
- **Endpoint**: `/coordinators/module/enviar/subcoordinator`
- **Permiso de modificación**: ADMIN, PASTOR y usuarios con rol LIDER_DOCE o que sean coordinadores del módulo
- **Condición adicional**: También puede ser modificado si el usuario actual es el coordinador del módulo (`moduleCoordinator.id === user?.id`)

---

## 5. Pestañas del Módulo Enviar

| ID Pestaña | Nombre | Componente | Roles con Acceso |
|------------|--------|------------|------------------|
| cells | Células | CellManagement | ADMIN, PASTOR, LIDER_DOCE (propia red), LIDER_CELULA, DISCIPULO |
| attendance | Asistencia | CellAttendance | Todos los usuarios autenticados |
| stats | Estadísticas | AttendanceChart | ALL_LEADERS |

---

## 6. Permisos de Acceso a Pestañas (Custom Checks)

### 6.1 Pestaña Células (Cells)

El acceso a la pestaña de células se determina mediante la función `hasCellsTabAccess()`:

```javascript
const hasCellsTabAccess = () => {
    const hasRoleAccess = hasAnyRole(ROLE_GROUPS.CAN_MANAGE_CELLS); // [ADMIN, PASTOR, LIDER_DOCE]
    const isModuleCoord = moduleCoordinator && moduleCoordinator.id === user.id;
    return hasRoleAccess || isModuleCoord;
};
```

Esto significa que:
- ADMIN, PASTOR y LIDER_DOCE tienen acceso completo
- El coordinador del módulo también tiene acceso
- Los líderes de células y discípulos pueden ver la lista pero con permisos limitados

---

## 7. Características de CellManagement

### 7.1 Datos de Célula

Cada célula puede contener:

| Campo | Descripción |
|-------|-------------|
| name | Nombre de la célula |
| leaderId | Líder de la célula |
| hostId | Anfitrión de la célula |
| liderDoceId | Líder de 12 asignado |
| address | Dirección |
| city | Ciudad |
| barrio | Barrio |
| network | Red |
| dayOfWeek | Día de reunión |
| time | Hora de reunión |
| cellType | Tipo de célula (ABIERTA, etc.) |
| latitude/longitude | Coordenadas geográficas |
| fastingDate | Fecha de ayuno |
| rhemaWord | Palabra rhema |
| pastorsMeeting | Reunión con pasteur |

### 7.2 Funcionalidades de Mapa

El módulo incluye integración con Leaflet para mostrar las células en un mapa geográfico, permitiendo:
- Visualización de ubicación de células
- Marcadores en el mapa
- Geolocalización

---

## 8. Dependencias y Recursos

### Endpoints del Servidor Relacionados

- Gestión de células: Definidos en las rutas del servidor
- Asistencia: `useCellAttendance` hook personalizado

### Bibliotecas Externas

- `react-leaflet`: Para integración de mapas
- `leaflet`: Biblioteca de mapas open source
- `phosphor-icons`: Iconos del sistema

### Hooks Personalizados

- `useCellAttendance`: Hook para gestión de asistencia a células

---

## 9. Información del Proyecto

| Atributo | Valor |
|----------|-------|
| Nombre del Proyecto | Proyecto_Iglesia |
| Módulo | Enviar (Gestión de Células) |
| Tecnologías Frontend | React + Vite |
| Dependencias de Mapas | React Leaflet |
| Estilo de Componentes | Phosphor Icons |
| Gestión de Estado | React Hooks (useState, useEffect) |