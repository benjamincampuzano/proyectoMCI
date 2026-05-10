# Informe del Módulo Kids

## 1. Descripción General del Módulo

El módulo **Kids** (también conocido como "Módulo Infantil") es responsable de la gestión integral de la formación espiritual de niños, adolescentes y jóvenes de la iglesia. Este módulo permite:

- La gestión de cursos para diferentes grupos de edad
- El seguimiento del cronograma de actividades
- La visualización de la matriz de estudiantes
- Reportes estadísticos del módulo

### Componentes Principales

| Componente | Archivo | Función |
|------------|---------|---------|
| KidsModule.jsx | `client/src/pages/KidsModule.jsx` | Página principal con navegación por pestañas |
| KidsCourseManagement.jsx | `client/src/components/Kids/KidsCourseManagement.jsx` | Gestión de clases y cursos |
| KidsSchedule.jsx | `client/src/components/Kids/KidsSchedule.jsx` | Cronograma de actividades |
| KidsStudentMatrix.jsx | `client/src/components/Kids/KidsStudentMatrix.jsx` | Matriz de estudiantes |
| KidsStats.jsx | `client/src/components/Kids/KidsStats.jsx` | Reportes estadísticos |

### Grupos de Edad del Módulo

El módulo está diseñado para atender diferentes grupos etarios:

| Categoría | Rango de Edad | Identificador |
|-----------|---------------|---------------|
| Kids 1 | 5-7 años | KIDS1 |
| Kids 2 | 8-10 años | KIDS2 |
| Teens | 11-13 años | TEENS |
| Jóvenes | 14+ años | JOVENES |

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
CAN_MANAGE_CLASSES: [ADMIN, LIDER_DOCE, LIDER_CELULA, DISCIPULO]
```

---

## 3. Permisos por Rol en el Módulo Kids

### 3.1 ADMIN - Administrador

| Función | Permiso |
|---------|---------|
| Crear nuevas clases | ✓ |
| Editar clases existentes | ✓ |
| Eliminar clases | ✓ |
| Gestionar cronograma | ✓ |
| Ver matriz de estudiantes | ✓ |
| Ver estadísticas | ✓ |
| Gestionar coordinadores del módulo | ✓ |
| Gestionar subcoordinadores del módulo | ✓ |

### 3.2 PASTOR - Pastor

| Función | Permiso |
|---------|---------|
| Crear nuevas clases | ✗ |
| Editar clases existentes | ✗ |
| Gestionar cronograma | ✓ |
| Ver matriz de estudiantes | ✓ |
| Ver estadísticas | ✓ |
| Gestionar coordinadores del módulo | ✓ |
| Gestionar subcoordinadores del módulo | ✓ |

### 3.3 LIDER_DOCE - Líder de 12

| Función | Permiso |
|---------|---------|
| Crear nuevas clases | ✗ |
| Gestionar cronograma | ✓ (si es coordinador) |
| Ver matriz de estudiantes | ✓ |
| Ver estadísticas | ✓ |
| Ser coordinador de módulo | ✓ |
| Ser subcoordinador de módulo | ✓ |

### 3.4 LIDER_CELULA - Líder de Célula

| Función | Permiso |
|---------|---------|
| Crear nuevas clases | ✗ |
| Gestionar cronograma | ✗ |
| Ver matriz de estudiantes | ✓ |
| Ver estadísticas | ✓ |

### 3.5 DISCIPULO - Discípulo

| Función | Permiso |
|---------|---------|
| Crear nuevas clases | ✗ |
| Gestionar cronograma | ✗ |
| Ver matriz de estudiantes | ✗ |
| Ver estadísticas | ✗ |
| Gestionar clase (como profesor/auxiliar) | ✓ (si está asignado) |

---

## 4. Sistema de Coordinadores del Módulo

### 4.1 Coordinador del Módulo (CoordinatorSelector)

- **Identificación**: Campo `moduleCoordinator` en estado local
- **Endpoint**: `/coordinators/module/kids`
- **Fallback**: `/coordinators` con filtro por módulo
- **Permiso de modificación**: Solo ADMIN y PASTOR

### 4.2 Subcoordinador del Módulo (SubCoordinatorSelector)

- **Identificación**: Campo `moduleSubCoordinator` en estado local
- **Endpoint**: `/coordinators/module/kids/subcoordinator`
- **Permiso de modificación**: Solo ADMIN y PASTOR
- **Condición adicional**: También accesible para usuarios con `isCoordinator`

---

## 5. Pestañas del Módulo Kids

| ID Pestaña | Nombre | Componente | Roles con Acceso |
|------------|--------|------------|------------------|
| schedule | Cronograma | KidsSchedule | ALL_LEADERS + Coordinator + Teacher/Auxiliary |
| management | Clases y Notas | KidsCourseManagement | ADMIN, LIDER_DOCE, LIDER_CELULA, DISCIPULO |
| matrix | Matriz de Estudiantes | KidsStudentMatrix | ALL_LEADERS + Coordinator + Teacher/Auxiliary |
| stats | Reporte Estadístico | KidsStats | ALL_LEADERS |

---

## 6. Permisos de Acceso con Custom Checks

### 6.1 Cronograma y Matriz (schedule, matrix)

El acceso a estas pestañas se determina mediante función `hasScheduleOrMatrixAccess()`:

```javascript
const hasScheduleOrMatrixAccess = () => {
    const userRoles = hasAnyRole(SCHEDULE_AND_MATRIX_ROLES); // [ADMIN, PASTOR, LIDER_DOCE, LIDER_CELULA]
    const isCoord = moduleCoordinator && moduleCoordinator.id === user.id;
    const isTeacherOrAuxiliary = isKidsTeacherOrAuxiliary === true;
    
    return userRoles || isCoord || isTeacherOrAuxiliary;
};
```

Esto significa que tienen acceso:
- Usuarios con rol ADMIN, PASTOR, LIDER_DOCE o LIDER_CELULA
- Coordinador del módulo Kids
- Profesores o auxiliares asignados al módulo Kids

### 6.2 Verificación de Profesor/Auxiliar

El sistema verifica si el usuario actual es profesor o auxiliar del módulo Kids mediante:

```javascript
const checkIfKidsTeacherOrAuxiliary = async () => {
    const res = await api.get('/kids/students/check-access');
    setIsKidsTeacherOrAuxiliary(res.data.hasAccess);
};
```

---

## 7. Características de KidsSchedule

El componente de cronograma incluye:

- **Gestión de eventos**: Programación de actividades del módulo
- **Vista de calendario**: Visualización de eventos programados
- **Coordinación con módulo**: Integración con el coordinador del módulo

---

## 8. Características de KidsCourseManagement

### 8.1 Categorías de Cursos

| Categoría | Etiqueta UI | Color |
|-----------|-------------|-------|
| KIDS1 | Kids 1 (5-7 años) | Rosa |
| KIDS2 | Kids 2 (8-10 años) | Morado |
| TEENS | Teens (11-13 años) | Azul |
| JOVENES | Jóvenes (14+) | Verde |

### 8.2 Vistas Disponibles

- **Vista de tarjetas**: Visualización visual de cursos
- **Vista de tabla**: Visualización tabular de cursos

---

## 9. Dependencias y Recursos

### Endpoints del Servidor Relacionados

- `/kids/modules` - Gestión de módulos/cursos
- `/kids/students/*` - Gestión de estudiantes
- `/kids/students/check-access` - Verificación de acceso de profesor/auxiliar

### Bibliotecas Externas

- `phosphor-icons`: Iconos del sistema

---

## 10. Información del Proyecto

| Atributo | Valor |
|----------|-------|
| Nombre del Proyecto | Proyecto_Iglesia |
| Módulo | Kids (Módulo Infantil) |
| Descripción | Escuela infantil: Kids 1 (5-7), Kids 2 (8 a 10), Teens (11-13) y Jóvenes (14+) |
| Tecnologías Frontend | React + Vite |
| Estilo de Componentes | Phosphor Icons |
| Gestión de Estado | React Hooks (useState, useEffect) |