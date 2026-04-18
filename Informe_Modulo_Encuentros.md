# Informe del Módulo Encuentros

## 1. Descripción General del Módulo

El módulo **Encuentros** es responsable de la gestión integral de los encuentros de la iglesia (Pre-encuentros y Pos-encuentros), incluyendo la planificación, inscripción de participantes, control de pagos y seguimiento. Este módulo permite:

- La creación y gestión de encuentros (Pre y Pos encuentros)
- La inscripción de miembros a cada encuentro
- El registro y seguimiento de pagos
- La visualización de reportes y estadísticas
- La asignación de coordinadores responsables

### Componentes Principales

| Componente | Archivo | Función |
|------------|---------|---------|
| Encuentros.jsx | `client/src/pages/Encuentros.jsx` | Página principal con gestión de encuentros |
| EncuentroDetails.jsx | `client/src/components/EncuentroDetails.jsx` | Detalles de cada encuentro |
| EncuentroTable.jsx | `client/src/components/EncuentroTable.jsx` | Vista tabular de encuentros |
| EncuentrosReport.jsx | `client/src/components/EncuentrosReport.jsx` | Reportes del módulo |

### Tipos de Encuentros

El sistema soporta los siguientes tipos de encuentros:

| Tipo | Descripción |
|------|-------------|
| HOMBREES | Encuentros de hombres |
| MUJERES | Encuentros de mujeres |
| JOVENES | Encuentros de jóvenes |

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

| Rol Especial | Descripción |
|--------------|-------------|
| isModuleCoordinator | Coordinador del módulo Encuentros |
| isModuleSubCoordinator | Subcoordinador del módulo |
| isModuleTreasurer | Tesorero del módulo |

---

## 3. Permisos por Rol en el Módulo Encuentros

### 3.1 ADMIN - Administrador

| Función | Permiso |
|---------|---------|
| Crear nuevos encuentros | ✓ |
| Editar encuentros existentes | ✓ |
| Eliminar encuentros | ✓ |
| Inscribir participantes | ✓ |
| Gestionar pagos | ✓ |
| Ver reportes | ✓ |
| Gestionar coordinadores del módulo | ✓ |
| Gestionar subcoordinadores del módulo | ✓ |
| Gestionar tesoreros del módulo | ✓ |

### 3.2 PASTOR - Pastor

| Función | Permiso |
|---------|---------|
| Crear nuevos encuentros | ✓ |
| Editar encuentros existentes | ✓ |
| Eliminar encuentros | ✓ |
| Inscribir participantes | ✓ |
| Gestionar pagos | ✓ |
| Ver reportes | ✓ |
| Gestionar coordinadores del módulo | ✓ |
| Gestionar subcoordinadores del módulo | ✓ |
| Gestionar tesoreros del módulo | ✓ |

### 3.3 LIDER_DOCE - Líder de 12

| Función | Permiso |
|---------|---------|
| Crear nuevos encuentros | ✓ (si es coordinador de módulo) |
| Editar encuentros existentes | ✓ (si es coordinador de módulo) |
| Eliminar encuentros | ✓ (si es coordinador de módulo) |
| Ver reportes | ✓ (si es coordinador de módulo) |
| Ser coordinador de módulo | ✓ |
| Ser subcoordinador de módulo | ✓ |
| Ser tesorero de módulo | ✓ |

### 3.4 LIDER_CELULA - Líder de Célula

| Función | Permiso |
|---------|---------|
| Crear nuevos encuentros | ✗ |
| Ver lista de encuentros | ✓ |
| Ver reportes | ✗ |

### 3.5 DISCIPULO - Discípulo

| Función | Permiso |
|---------|---------|
| Crear nuevos encuentros | ✗ |
| Ver lista de encuentros | ✓ |
| Ver reportes | ✗ |

---

## 4. Sistema de Roles Especiales del Módulo

### 4.1 Coordinador del Módulo (CoordinatorSelector)

- **Identificación**: Campo `moduleCoordinator` en estado local
- **Endpoint**: `/coordinators/module/encuentros`
- **Permiso de modificación**: Solo ADMIN y PASTOR

### 4.2 Subcoordinador del Módulo (SubCoordinatorSelector)

- **Identificación**: Campo `moduleSubCoordinator` en estado local
- **Endpoint**: `/coordinators/module/encuentros/subcoordinator`
- **Permiso de modificación**: ADMIN, PASTOR y usuarios con `isCoordinator`

### 4.3 Tesorero del Módulo (TreasurerSelector)

- **Identificación**: Campo `moduleTreasurer` en estado local
- **Endpoint**: `/coordinators/module/encuentros/treasurer`
- **Permiso de modificación**: ADMIN, PASTOR y usuarios con `isCoordinator`

---

## 5. Lógica de Permisos de Acceso

### 5.1 Permisos de Creación y Eliminación

```javascript
const hasAdminOrCoordinator = hasAnyRole(['ADMIN']) || isCoordinator();
const canCreateOrDelete = hasAdminOrCoordinator;
const canViewReport = hasAdminOrCoordinator;
```

Esto significa que pueden crear, editar, eliminar y ver reportes:
- ADMIN
- Usuarios con rol de coordinator (isCoordinator())

### 5.2 Diferencia con Convenciones

A diferencia del módulo Convenciones donde `LIDER_DOCE` tiene permisos por defecto, en el módulo Encuentros los permisos están más restringidos:
- Solo ADMIN tiene acceso por rol
- Los coordinadores de módulo también tienen acceso
- PASTOR puede gestionar coordinadores pero no crear por defecto

---

## 6. Características de Gestión de Encuentros

### 6.1 Datos de un Encuentro

| Campo | Descripción |
|-------|-------------|
| type | Tipo de encuentro (HOMBREES, MUJERES, JOVENES) |
| name | Palabra Rhema del encuentro |
| description | Descripción del encuentro |
| cost | Costo de inscripción/donación |
| transportCost | Costo de transporte |
| accommodationCost | Costo de hospedaje |
| startDate | Fecha de inicio |
| endDate | Fecha de fin |
| coordinatorId | ID del coordinador responsable |

### 6.2 Diferencias con Convenciones

| Campo | Convenciones | Encuentros |
|-------|--------------|------------|
| name | No existe (usa type + year) | Palabra Rhema (requerido) |
| description | No existe | Descripción (opcional) |
| type | FAMILIAS, MUJERES, JOVENES, HOMBREES | HOMBREES, MUJERES, JOVENES |
| year | Campo separado | No existe |

---

## 7. Estados de Inscripción

Los participantes pueden tener diferentes estados de pago:
- **totalPaid**: Total pagado
- **balance**: Saldo pendiente

---

## 8. Estadísticas del Módulo

El módulo calcula automáticamente las siguientes métricas:

| Métrica | Descripción |
|---------|-------------|
| total | Total de encuentros |
| inscritos | Total de participantes inscritos |
| recaado | Total de dinero recaudo |
| pendiente | Total de dinero pendiente por cobrar |

### 8.1 Cálculos

```
recaudado = suma de totalPaid de todas las inscripciones
pendiente = suma de balance de todas las inscripciones
inscritos = suma de registrations de todos los encuentros
```

---

## 9. Endpoints del Servidor

### 9.1 Gestión de Encuentros

- `GET /encuentros` - Listar todos los encuentros
- `POST /encuentros` - Crear nuevo encuentro
- `GET /encuentros/:id` - Obtener detalles de un encuentro
- `PUT /encuentros/:id` - Actualizar encuentro
- `DELETE /encuentros/:id` - Eliminar encuentro

### 9.2 Gestión de Coordinadores

- `/coordinators/module/encuentros` - Coordinator
- `/coordinators/module/encuentros/subcoordinator` - SubCoordinator
- `/coordinators/module/encuentros/treasurer` - Treasurer

### 9.3 Middleware de Permisos

Similar al módulo Convenciones, utiliza middlewares de autenticación y coordinación.

---

## 10. Dependencias y Recursos

### Bibliotecas Externas

- `phosphor-icons`: Iconos del sistema (Calendar, Users, MoneyIcon, etc.)

### Iconos Utilizados

| Icono | Uso |
|-------|-----|
| Calendar | Fechas |
| Users | Participantes |
| MoneyIcon | Pagos |
| UserCheck | Coordinador |
| Trash | Eliminar |
| FileTextIcon | Reportes |
| Plus | Crear nuevo |
| ArrowsClockwise | Actualizar |

---

## 11. Información del Proyecto

| Atributo | Valor |
|----------|-------|
| Nombre del Proyecto | Proyecto_Iglesia |
| Módulo | Encuentros |
| Descripción | Gestión de Encuentros (Pre y Pos encuentros) |
| Tecnologías Frontend | React + Vite |
| Estilo de Componentes | Phosphor Icons |
| Gestión de Estado | React Hooks + useMemo para estadísticas |

---

## 12. Relación con Otros Módulos

El módulo Encuentros comparte patrones similares con:

- **Convenciones**: Mismo flujo de trabajo (crear → inscribir → pagar → reportes)
- **Escuela de Artes**: Sistema de estadísticas similar (total, inscritos, recaado, pendiente)
- **Kids**: Uso de CoordinatorSelector, SubCoordinatorSelector y TreasurerSelector