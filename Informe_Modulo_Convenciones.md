# Informe del Módulo Convenciones

## 1. Descripción General del Módulo

El módulo **Convenciones** es responsable de la gestión integral de las convenciones anuales de la iglesia, incluyendo la planificación, inscripción de participantes, control de pagos y seguimiento. Este módulo permite:

- La creación y gestión de convenciones anuales
- La inscripción de miembros a cada convención
- El registro y seguimiento de pagos
- La visualización de reportes y estadísticas
- La asignación de coordinadores responsables

### Componentes Principales

| Componente | Archivo | Función |
|------------|---------|---------|
| Convenciones.jsx | `client/src/pages/Convenciones.jsx` | Página principal con gestión de convenciones |
| ConventionDetails.jsx | `client/src/components/ConventionDetails.jsx` | Detalles de cada convención |
| ConvencionTable.jsx | `client/src/components/ConvencionTable.jsx` | Vista tabular de convenciones |
| ConvencionesReport.jsx | `client/src/components/ConvencionesReport.jsx` | Reportes del módulo |

### Tipos de Convenciones

El sistema soporta los siguientes tipos de convenciones:

| Tipo | Descripción |
|------|-------------|
| FAMILIAS | Convención de familias |
| MUJERES | Convención de mujeres |
| JOVENES | Convención de jóvenes |
| HOMBRES | Convención de hombres |

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
| isModuleCoordinator | Coordinador del módulo Convenciones |
| isModuleSubCoordinator | Subcoordinador del módulo |
| isModuleTreasurer | Tesorero del módulo |

---

## 3. Permisos por Rol en el Módulo Convenciones

### 3.1 ADMIN - Administrador

| Función | Permiso |
|---------|---------|
| Crear nuevas convenciones | ✓ |
| Editar convenciones existentes | ✓ |
| Eliminar convenciones | ✓ |
| Inscribir participantes | ✓ |
| Gestionar pagos | ✓ |
| Ver reportes | ✓ |
| Gestionar coordinadores del módulo | ✓ |
| Gestionar subcoordinadores del módulo | ✓ |
| Gestionar tesoreros del módulo | ✓ |

### 3.2 PASTOR - Pastor

| Función | Permiso |
|---------|---------|
| Crear nuevas convenciones | ✓ |
| Editar convenciones existentes | ✓ |
| Eliminar convenciones | ✓ |
| Inscribir participantes | ✓ |
| Gestionar pagos | ✓ |
| Ver reportes | ✓ |
| Gestionar coordinadores del módulo | ✓ |
| Gestionar subcoordinadores del módulo | ✓ |
| Gestionar tesoreros del módulo | ✓ |

### 3.3 LIDER_DOCE - Líder de 12

| Función | Permiso |
|---------|---------|
| Crear nuevas convenciones | ✓ |
| Editar convenciones existentes | ✓ |
| Eliminar convenciones | ✓ |
| Ver reportes | ✓ |
| Ser coordinador de módulo | ✓ |
| Ser subcoordinador de módulo | ✓ |
| Ser tesorero de módulo | ✓ |

### 3.4 LIDER_CELULA - Líder de Célula

| Función | Permiso |
|---------|---------|
| Crear nuevas convenciones | ✗ |
| Ver lista de convenciones | ✓ |
| Ver reportes | ✗ |

### 3.5 DISCIPULO - Discípulo

| Función | Permiso |
|---------|---------|
| Crear nuevas convenciones | ✗ |
| Ver lista de convenciones | ✓ |
| Ver reportes | ✗ |

---

## 4. Sistema de Roles Especiales del Módulo

### 4.1 Coordinador del Módulo (CoordinatorSelector)

- **Identificación**: Campo `moduleCoordinator` en estado local
- **Endpoint**: `/coordinators/module/convenciones`
- **Permiso de modificación**: Solo ADMIN y PASTOR

### 4.2 Subcoordinador del Módulo (SubCoordinatorSelector)

- **Identificación**: Campo `moduleSubCoordinator` en estado local
- **Endpoint**: `/coordinators/module/convenciones/subcoordinator`
- **Permiso de modificación**: ADMIN, PASTOR y usuarios con `isCoordinator`

### 4.3 Tesorero del Módulo (TreasurerSelector)

- **Identificación**: Campo `moduleTreasurer` en estado local
- **Endpoint**: `/coordinators/module/convenciones/treasurer`
- **Permiso de modificación**: ADMIN, PASTOR y usuarios con `isCoordinator`

---

## 5. Lógica de Permisos de Acceso

### 5.1 Permisos de Modificación

```javascript
const canModify = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']);
const canViewReport = hasAnyRole(['ADMIN', 'PASTOR', 'LIDER_DOCE']);
```

Esto significa que pueden crear, editar, eliminar y ver reportes:
- ADMIN
- PASTOR
- LIDER_DOCE

### 5.2 Botón de Creación

El botón "Nueva Convención" solo es visible para usuarios con `canModify`.

---

## 6. Características de Gestión de Convenciones

### 6.1 Datos de una Convención

| Campo | Descripción |
|-------|-------------|
| type | Tipo de convención (FAMILIAS, MUJERES, JOVENES, HOMBRES) |
| year | Año de la convención |
| theme | Lema o tema de la convención |
| cost | Costo total de inscripción |
| transportCost | Costo de transporte |
| accommodationCost | Costo de hospedaje |
| startDate | Fecha de inicio |
| endDate | Fecha de fin |
| coordinatorId | ID del coordinador responsable |

### 6.2 Estados de Inscripción

Los participantes pueden tener diferentes estados de pago:
- **totalPaid**: Total pagado
- **balance**: Saldo pendiente

---

## 7. Estadísticas del Módulo

El módulo calcula automáticamente las siguientes métricas:

| Métrica | Descripción |
|---------|-------------|
| total | Total de convenciones |
| inscritos | Total de participantes inscritos |
| recaudado | Total de dinero recaudo |
| pendiente | Total de dinero pendiente por cobrar |

### 7.1 Cálculos

```
recaudado = suma de totalPaid de todas las inscripciones
pendiente = suma de balance de todas las inscripciones
inscritos = suma de registrations de todas las convenciones
```

---

## 8. Endpoints del Servidor

### 8.1 Gestión de Convenciones

- `GET /convenciones` - Listar todas las convenciones
- `POST /convenciones` - Crear nueva convención
- `GET /convenciones/:id` - Obtener detalles de una convención
- `PUT /convenciones/:id` - Actualizar convención
- `DELETE /convenciones/:id` - Eliminar convención
- `GET /convenciones/:id/report/balance` - Reporte de balance

### 8.2 Gestión de Inscripciones

- `POST /convenciones/:conventionId/register` - Registrar usuario
- `POST /convenciones/registrations/:registrationId/payments` - Agregar pago
- `DELETE /convenciones/registrations/:registrationId` - Eliminar inscripción

### 8.3 Middleware de Permisos

- `canManageTreasurerActions('Convenciones')` - Middleware para gestionar pagos

---

## 9. Dependencias y Recursos

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

---

## 10. Información del Proyecto

| Atributo | Valor |
|----------|-------|
| Nombre del Proyecto | Proyecto_Iglesia |
| Módulo | Convenciones |
| Descripción | Seguimiento de Convenciones anuales |
| Tecnologías Frontend | React + Vite |
| Estilo de Componentes | Phosphor Icons |
| Gestión de Estado | React Hooks + useMemo para estadísticas |

---

## 11. Diferencias con Módulo Encuentros

El módulo Convenciones es muy similar al módulo Encuentros, con las siguientes diferencias principales:

| Característica | Convenciones | Encuentros |
|----------------|--------------|------------|
| Frecuencia | Anual | Variable (Pre/Pos encuentros) |
| Tipos | FAMILIAS, MUJERES, JOVENES, HOMBRES | HOMBRES, MUJERES, JOVENES |
| Campo name | No tiene (usa type + year) | Palabra Rhema |
| Campo theme | Lema/Tema | Descripción |