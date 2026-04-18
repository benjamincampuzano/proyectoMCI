# Informe del Módulo Discipular

## 1. Descripción General del Módulo

El módulo **Discipular** (también conocido como "Capacitación Destino" o "Escuela de Liderazgo") es responsable de la gestión integral de la formación académica y espiritual de los miembros de la iglesia. Este módulo permite:

- La gestión de cursos y clases de la escuela de liderazgo
- El seguimiento del progreso académico de los estudiantes (matrículas, notas, asistencia)
- La visualización de estadísticas de rendimiento por líder
- La gestión de materiales de estudio
- La asignación de profesores y auxiliares a cada curso

### Componentes Principales

| Componente | Archivo | Función |
|------------|---------|---------|
| Discipular.jsx | `client/src/pages/Discipular.jsx` | Página principal con navegación por pestañas |
| CourseManagement.jsx | `client/src/components/School/CourseManagement.jsx` | Gestión de clases y cursos |
| StudentMatrix.jsx | `client/src/components/School/StudentMatrix.jsx` | Matriz de estudiantes con sus calificaciones |
| SchoolLeaderStats.jsx | `client/src/components/School/SchoolLeaderStats.jsx` | Reportes estadísticos por líder |
| ClassMatrix.jsx | `client/src/components/School/ClassMatrix.jsx` | Matriz de notas por clase |
| ClassMaterialManager.jsx | `client/src/components/School/ClassMaterialManager.jsx` | Gestión de materiales educativos |

### Niveles y Cursos Definidos

El módulo cuenta con 6 cursos organizados en 3 niveles:

| Nivel | Sección | Nombre del Curso | Número de Módulo |
|-------|---------|------------------|------------------|
| 1 | A | Pastoreados en su amor | 1 |
| 1 | B | El poder de una Visión | 2 |
| 2 | A | La estrategia del Ganar | 3 |
| 2 | B | Familias con Propósito | 4 |
| 3 | A | Liderazgo Eficaz | 5 |
| 3 | B | El Espíritu Santo en Mí | 6 |

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
CAN_VIEW_STATS: [ADMIN, PASTOR, LIDER_DOCE, LIDER_CELULA]
```

---

## 3. Permisos por Rol en el Módulo Discipular

### 3.1 ADMIN - Administrador

| Función | Permiso |
|---------|---------|
| Crear nuevas clases/cursos | ✓ |
| Editar clases existentes | ✓ |
| Eliminar clases | ✓ (solo si no hay estudiantes inscritos) |
| Gestionar materiales de estudio | ✓ |
| Inscribir/desinscribir estudiantes | ✓ |
| Registrar notas y asistencia | ✓ |
| Exportar estadísticas a Excel | ✓ |
| Gestionar coordinadores del módulo | ✓ |
| Gestionar tesoreros del módulo | ✓ |
| Gestionar subcoordinadores del módulo | ✓ |

### 3.2 PASTOR - Pastor

| Función | Permiso |
|---------|---------|
| Crear nuevas clases/cursos | ✗ |
| Editar clases existentes | ✗ |
| Gestionar coordinadores del módulo | ✓ |
| Gestionar tesoreros del módulo | ✓ |
| Visualizar matriz de estudiantes | ✓ |
| Visualizar estadísticas | ✓ |
| Exportar estadísticas a Excel | ✓ |

### 3.3 LIDER_DOCE - Líder de 12

| Función | Permiso |
|---------|---------|
| Crear nuevas clases/cursos | ✓ (si es coordinador del módulo) |
| Editar clases existentes | ✓ (si es coordinador del módulo) |
| Gestionar materiales de estudio | ✓ (si es coordinador o auxiliar asignado) |
| Inscribir/desinscribir estudiantes | ✓ (si es coordinador del módulo) |
| Registrar notas y asistencia | ✓ (como profesor o auxiliar) |
| Visualizar matriz de estudiantes | ✓ |
| Visualizar estadísticas | ✓ |
| Exportar estadísticas a Excel | ✓ |
| Ser coordinador de módulo | ✓ |
| Ser subcoordinador de módulo | ✓ |

### 3.4 LIDER_CELULA - Líder de Célula

| Función | Permiso |
|---------|---------|
| Crear nuevas clases/cursos | ✗ |
| Gestionar materiales de estudio | ✗ |
| Inscribir/desinscribir estudiantes | ✗ |
| Registrar notas y asistencia | ✗ |
| Visualizar matriz de estudiantes | ✓ |
| Visualizar estadísticas | ✓ |
| Exportar estadísticas a Excel | ✓ |

### 3.5 DISCIPULO - Discípulo

| Función | Permiso |
|---------|---------|
| Crear nuevas clases/cursos | ✗ |
| Gestionar materiales de estudio | ✓ (solo ver, no gestionar) |
| Inscribir/desinscribir estudiantes | ✗ |
| Registrar notas y asistencia | ✗ |
| Visualizar matriz de estudiantes | ✗ |
| Visualizar estadísticas | ✗ |
| Gestionar oración de tres | ✓ |
| Ser auxiliar de curso | ✓ (asignado por ADMIN/coordinador) |

---

## 4. Sistema de Roles Especiales del Módulo

### 4.1 Coordinador del Módulo (CoordinatorSelector)

- **Identificación**: Campo `moduleCoordinator` en estado local
- **Endpoint**: `/coordinators/module/discipular`
- **Fallback**: `/coordinators` con filtro por módulo
- **Permiso de modificación**: Solo ADMIN y PASTOR
- **Roles elegibles**: Generalmente ADMIN o LIDER_DOCE con flag `isCoordinator`

### 4.2 Subcoordinador del Módulo (SubCoordinatorSelector)

- **Identificación**: Campo `moduleSubCoordinator` en estado local
- **Endpoint**: `/coordinators/module/discipular/subcoordinator`
- **Permiso de modificación**: ADMIN, PASTOR y usuarios con rol LIDER_DOCE o flag isCoordinator

### 4.3 Tesorero del Módulo (TreasurerSelector)

- **Identificación**: Campo `moduleTreasurer` en estado local
- **Endpoint**: `/coordinators/module/discipular/treasurer`
- **Permiso de modificación**: Solo ADMIN y PASTOR
- **Función**: Gestión de finanzas específicas del módulo Discipular

---

## 5. Pestañas del Módulo Discipular

| ID Pestaña | Nombre | Componente | Roles con Acceso |
|------------|--------|------------|------------------|
| management | Clases y Notas | CourseManagement | ADMIN, LIDER_DOCE, LIDER_CELULA, DISCIPULO |
| matrix | Matriz de Estudiantes | StudentMatrix | ALL_LEADERS |
| stats | Reporte Estadístico | SchoolLeaderStats | ALL_LEADERS |

---

## 6. Permisos Detallados por Componente

### 6.1 CourseManagement (Gestión de Clases)

| Acción | ADMIN | LIDER_DOCE (Coord.) | LIDER_CELULA | DISCIPULO |
|--------|-------|---------------------|--------------|-----------|
| Crear clase | ✓ | ✓ | ✗ | ✗ |
| Editar clase | ✓ | ✓ | ✗ | ✗ |
| Eliminar clase | ✓ | ✓ | ✗ | ✗ |
| Gestionar materiales | ✓ | ✓ (coord. o auxiliar) | ✗ | ✗ (solo ver) |
| Ver lista de clases | ✓ | ✓ | ✓ | ✓ |

### 6.2 StudentMatrix (Matriz de Estudiantes)

- **Acceso**: ALL_LEADERS [ADMIN, PASTOR, LIDER_DOCE, LIDER_CELULA]
- **Funcionalidades**:
  - Visualización de todos los estudiantes matriculados
  - Estado de aprobación por nivel (aprobado si nota >= 7)
  - Cálculo de promedio de notas
  - Cálculo de tasa de asistencia
  - Filtrado por líder de 12 y nivel

### 6.3 SchoolLeaderStats (Estadísticas por Líder)

| Acción | ADMIN | PASTOR | LIDER_DOCE | LIDER_CELULA |
|--------|-------|--------|------------|--------------|
| Ver estadísticas | ✓ | ✓ | ✓ | ✓ |
| Exportar Excel | ✓ | ✓ | ✓ | ✗ |

---

## 7. Sistema de Auxiliares de Curso

Los cursos pueden tener auxiliares asignados que poseen permisos especiales:

- **Profesor (professorId)**: Responsable principal de la clase
- **Auxiliar (auxiliarId)**: Colaborador con permisos específicos

### Permisos del Auxiliar Asignado

Un usuario asignado como auxiliar a un curso específico puede:
- Gestionar materiales de ese curso específico
- Ver información del curso
- Registrar asistencia y notas (si está configurado)

---

## 8. Métricas y Cálculos

### 8.1 Estado de Notas (StudentMatrix)

```
Si finalGrade >= 7: Completado y Aprobado
Si finalGrade < 7: Completado pero No Aprobado
Si finalGrade es null: En curso
```

### 8.2 Promedio de Notas

```
promedio = (suma de todas las finalGrade) / (cantidad de cursos con nota)
```

### 8.3 Tasa de Asistencia

```
tasa = (suma de attendanceRate de cada inscripción) / (cantidad de inscripciones)
```

---

## 9. Dependencias y Recursos

### Endpoints del Servidor Relacionados

- `GET /school/modules` - Listar todos los módulos/cursos
- `POST /school/modules` - Crear nuevo módulo
- `PUT /school/modules/:id` - Actualizar módulo
- `DELETE /school/modules/:id` - Eliminar módulo
- `GET /school/student-matrix` - Obtener matriz de estudiantes
- `GET /school/stats/leader` - Obtener estadísticas por líder

### Hooks y Contextos Utilizados

- `useAuth`: Context de autenticación para obtener usuario actual y permisos
- `useState`, `useEffect`: Gestión de estado local y efectos secundarios

---

## 10. Información del Proyecto

| Atributo | Valor |
|----------|-------|
| Nombre del Proyecto | Proyecto_Iglesia |
| Módulo | Discipular (Capacitación Destino / Escuela de Liderazgo) |
| Tecnologías Frontend | React + Vite |
| Dependencias Externas | Recharts (gráficos), XLSX (exportación Excel) |
| Estilo de Componentes | Phosphor Icons |
| Gestión de Estado | React Hooks (useState, useEffect, useCallback) |