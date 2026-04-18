# Informe del Módulo Escuela de Artes

## 1. Descripción General del Módulo

El módulo **Escuela de Artes** es responsable de la gestión integral de las clases de artes ofrecidas por la iglesia, incluyendo la administración de cursos, inscripciones de estudiantes, control de pagos y seguimiento de asistencia. Este módulo permite:

- La gestión de clases de artes (crear, editar, eliminar)
- La inscripción de estudiantes a clases
- El registro y seguimiento de pagos
- El control de asistencia a clases
- La visualización de reportes y estadísticas

### Componentes Principales

| Componente | Archivo | Función |
|------------|---------|---------|
| EscuelaDeArtes.jsx | `client/src/pages/EscuelaDeArtes.jsx` | Página principal con gestión de clases |
| ArtClassDetails.jsx | `client/src/components/ArtClassDetails.jsx` | Detalles de cada clase |
| ArtClassTable.jsx | `client/src/components/ArtClassTable.jsx` | Vista tabular de clases |
| ArtSchoolReport.jsx | `client/src/components/ArtSchoolReport.jsx` | Reportes del módulo |

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

### Roles Especiales del Módulo

El módulo define roles específicos adicionales:

| Rol Especial | Descripción |
|--------------|-------------|
| isModuleCoordinator | Coordinador del módulo Escuela de Artes |
| isModuleSubCoordinator | Subcoordinador del módulo |
| isModuleTreasurer | Tesorero del módulo |

---

## 3. Permisos por Rol en el Módulo Escuela de Artes

### 3.1 ADMIN - Administrador

| Función | Permiso |
|---------|---------|
| Crear nuevas clases | ✓ |
| Editar clases existentes | ✓ |
| Eliminar clases | ✓ (solo si no tiene estudiantes inscritos) |
| Inscribir estudiantes | ✓ |
| Gestionar pagos | ✓ |
| Registrar asistencia | ✓ |
| Ver reportes | ✓ |
| Gestionar coordinadores del módulo | ✓ |
| Gestionar subcoordinadores del módulo | ✓ |
| Gestionar tesoreros del módulo | ✓ |

### 3.2 PASTOR - Pastor

| Función | Permiso |
|---------|---------|
| Crear nuevas clases | ✓ |
| Editar clases existentes | ✓ |
| Eliminar clases | ✓ (solo si no tiene estudiantes inscritos) |
| Ver reportes | ✓ |
| Gestionar coordinadores del módulo | ✓ |
| Gestionar subcoordinadores del módulo | ✓ |
| Gestionar tesoreros del módulo | ✓ |

### 3.3 LIDER_DOCE - Líder de 12

| Función | Permiso |
|---------|---------|
| Crear nuevas clases | ✓ (si es coordinador del módulo) |
| Editar clases existentes | ✓ (si es coordinador del módulo) |
| Eliminar clases | ✓ (si es coordinador y no tiene inscritos) |
| Ver reportes | ✓ (si es coordinador o subcoordinador) |
| Ser coordinador de módulo | ✓ |
| Ser subcoordinador de módulo | ✓ |
| Ser tesorero de módulo | ✓ |

### 3.4 LIDER_CELULA - Líder de Célula

| Función | Permiso |
|---------|---------|
| Crear nuevas clases | ✗ |
| Ver lista de clases | ✓ |
| Ver reportes | ✗ |

### 3.5 DISCIPULO - Discípulo

| Función | Permiso |
|---------|---------|
| Crear nuevas clases | ✗ |
| Ver lista de clases | ✓ |
| Ver reportes | ✗ |

---

## 4. Sistema de Roles Especiales del Módulo

### 4.1 Coordinador del Módulo (CoordinatorSelector)

- **Identificación**: Campo `moduleCoordinator` en estado local
- **Endpoint**: `/coordinators/module/escuela-de-artes`
- **Permiso de modificación**: Solo ADMIN y PASTOR

### 4.2 Subcoordinador del Módulo (SubCoordinatorSelector)

- **Identificación**: Campo `moduleSubCoordinator` en estado local
- **Endpoint**: `/coordinators/module/escuela-de-artes/subcoordinator`
- **Permiso de modificación**: ADMIN, PASTOR y coordinador del módulo

### 4.3 Tesorero del Módulo (TreasurerSelector)

- **Identificación**: Campo `moduleTreasurer` en estado local
- **Endpoint**: `/coordinators/module/escuela-de-artes/treasurer`
- **Permiso de modificación**: ADMIN, PASTOR y coordinador del módulo

---

## 5. Lógica de Permisos de Acceso

### 5.1 Acceso Completo de Edición

```javascript
const hasFullEditAccess = hasAdminOrPastor || isModuleCoordinator || isModuleSubCoordinator;
```

Esto significa que pueden crear, editar y eliminar clases:
- ADMIN y PASTOR
- Coordinador del módulo
- Subcoordinador del módulo

### 5.2 Permisos de Profesor/Auxiliar

Los profesores y auxiliares de cada clase tienen acceso a:
- Ver detalles de su clase
- Registrar asistencia
- Gestionar estudiantes de su clase

---

## 6. Características de Gestión de Clases

### 6.1 Datos de una Clase

| Campo | Descripción |
|-------|-------------|
| name | Nombre de la clase |
| description | Descripción de la clase |
| cost | Costo de la clase |
| duration | Duración en semanas |
| schedule | Horario (día y hora) |
| professorId | ID del profesor |
| coordinatorId | ID del auxiliar/coordinador |

### 6.2 Horario

El sistema permite configurar:
- **Día**: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo
- **Hora de inicio**: Formato 24 horas
- **Hora de fin**: Formato 24 horas

### 6.3 Duración

La duración se define en horas por clase, con un默认值 de 8 clases totales.

---

## 7. Estadísticas del Módulo

El módulo calcula automáticamente las siguientes métricas:

| Métrica | Descripción |
|---------|-------------|
| total | Total de clases activas |
| inscritos | Total de estudiantes inscritos |
| recaudado | Total de dinero recaudo |
| pendiente | Total de dinero pendiente por cobrar |
| asistenciaPromedio | Porcentaje promedio de asistencia |

### 7.1 Cálculos

```
recaudado = suma de totalPaid de todas las inscripciones
pendiente = suma de balance de todas las inscripciones
asistenciaPromedio = (totalPresencias / totalPosibles) * 100
```

---

## 8. Endpoints del Servidor

### 8.1 Gestión de Clases

- `GET /arts/classes` - Listar todas las clases
- `POST /arts/classes` - Crear nueva clase
- `GET /arts/classes/:id` - Obtener detalles de una clase
- `PUT /arts/classes/:id` - Actualizar clase
- `DELETE /arts/classes/:id` - Eliminar clase

### 8.2 Gestión de Coordinadores

- `/coordinators/module/escuela-de-artes` - Coordinator
- `/coordinators/module/escuela-de-artes/subcoordinator` - SubCoordinator
- `/coordinators/module/escuela-de-artes/treasurer` - Treasurer

---

## 9. Dependencias y Recursos

### Bibliotecas Externas

- `phosphor-icons`: Iconos del sistema (GuitarIcon, Users, MoneyIcon, etc.)
- `react-leaflet`: Integración de mapas (no activamente usada pero importada)

### Iconos Utilizados

| Icono | Uso |
|-------|-----|
| GuitarIcon | Clases de arte |
| Users | Inscripciones |
| MoneyIcon | Pagos |
| GraduationCap | Profesores |
| Eye | Ver detalles |
| Pencil | Editar |
| Trash | Eliminar |

---

## 10. Información del Proyecto

| Atributo | Valor |
|----------|-------|
| Nombre del Proyecto | Proyecto_Iglesia |
| Módulo | Escuela de Artes |
| Descripción | Gestión de clases de arte, inscripciones, asistencias y abonos |
| Tecnologías Frontend | React + Vite |
| Estilo de Componentes | Phosphor Icons |
| Gestión de Estado | React Hooks + useMemo para estadísticas |

---

## 11. Convenciones (Módulo Relacionado)

Las convenciones son eventos especiales gestionados en rutas separadas (`server/routes/conventionRoutes.js`) que comparten algunos patrones con el módulo Escuela de Artes:

| Característica | Descripción |
|----------------|-------------|
| Endpoints | `/api/conventions/*` |
| Autenticación | Requiere autenticación |
| Permisos | middlewares `canManageTreasurerActions` |
| Funcionalidades | Registro de usuarios, pagos, reportes de balance |

Este módulo complementario permite gestionar eventos y convenciones especiales de la iglesia.