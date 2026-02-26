# Documentación del Proyecto - Sistema de Gestión de Iglesia

Este documento proporciona una visión general técnica y funcional del sistema de gestión de iglesia, detallando el stack tecnológico, la estructura de módulos y los componentes principales.

## Stack Tecnológico

### Frontend (Cliente)
*   **Lenguaje:** JavaScript (ES6+)
*   **Framework:** React v19.2.3
*   **Build Tool:** Vite v7.3.0
*   **Estilos:** TailwindCSS v4.1.18
*   **Routing:** React Router DOM v7.11.0
*   **Estado & Utilidades:**
    *   `axios` (Peticiones HTTP)
    *   `date-fns` (Manejo de fechas)
    *   `lodash` (Utilidades varias)
    *   `xlsx` (Exportación de datos)
*   **Visualización:**
    *   `recharts` (Gráficos y estadísticas)
    *   `leaflet` / `react-leaflet` (Mapas)
    *   `lucide-react` (Iconos)

### Backend (Servidor)
*   **Lenguaje:** JavaScript (Node.js - CommonJS)
*   **Framework:** Express v5.2.1
*   **ORM:** Prisma v6.6.0
*   **Base de Datos:** PostgreSQL (Inferido por Prisma)
*   **Seguridad:**
    *   `bcryptjs` (Hashing de contraseñas)
    *   `jsonwebtoken` (JWT para autenticación)
    *   `helmet` (Headers de seguridad HTTP)
    *   `cors` (Cross-Origin Resource Sharing)
*   **Herramientas:** `nodemon` (Hot reload en desarrollo)

---

## Módulos del Sistema

El sistema está dividido en módulos funcionales que mapean los procesos clave de la iglesia (Ganar, Consolidar, Discipular, Enviar) y funciones administrativas.

### 1. Autenticación y Seguridad
Gestión de acceso de usuarios y protección de rutas.

**Páginas:**
- `Login.jsx` - Inicio de sesión
- `Register.jsx` - Registro de usuarios
- `SetupWizard.jsx` - Configuración inicial del sistema

**Funciones Backend:**
- `POST /auth/setup` - Configuración inicial (primer usuario admin)
- `POST /auth/register` - Registro de nuevos usuarios
- `POST /auth/login` - Inicio de sesión
- `GET /auth/init-status` - Verificar estado de inicialización
- `GET /auth/leaders` - Obtener líderes públicos
- `POST /auth/public/guests` - Registro público de invitados
- `GET /auth/public/users/search` - Búsqueda pública de usuarios

**Controlador:** `authController.js`

---

### 2. Gestión de Usuarios y Red (Home)
Administración de perfiles y visualización de la red de discipulado (árbol jerárquico).

**Páginas:**
- `Home.jsx` - Dashboard principal
- `UserManagement.jsx` - Gestión de usuarios
- `AuditDashboard.jsx` - Panel de auditoría

**Componentes Clave:**
- `NetworkTree.jsx` - Visualización de jerarquía de red
- `UserManagementModal.jsx` - Modal CRUD de usuarios
- `UserProfileModal.jsx` - Perfil personal
- `AddUserModal.jsx` - Modal para agregar usuarios
- `UserActivityList.jsx` - Lista de actividad de usuarios

**Funciones Backend:**
- `GET /users` - Listar todos los usuarios
- `GET /users/:id` - Obtener usuario por ID
- `POST /users` - Crear usuario
- `PUT /users/:id` - Actualizar usuario
- `DELETE /users/:id` - Eliminar usuario
- `GET /users/profile` - Obtener perfil del usuario actual
- `PUT /users/profile` - Actualizar perfil
- `PUT /users/password` - Cambiar contraseña
- `POST /users/assign-leader/:id` - Asignar líder a usuario
- `GET /users/my-network/all` - Obtener mi red completa
- `GET /network/los-doce` - Obtener Los Doce
- `GET /network/pastores` - Obtener pastores
- `GET /network/network/:userId` - Obtener red de usuario
- `GET /network/available-users/:leaderId` - Usuarios disponibles para asignar
- `POST /network/assign` - Asignar usuario a líder
- `DELETE /network/remove/:userId` - Remover usuario de red
- `GET /network/activity-list` - Lista de actividad
- `GET /audit/logs` - Obtener logs de auditoría
- `GET /audit/stats` - Estadísticas de auditoría
- `GET /audit/backup` - Descargar respaldo
- `POST /audit/restore` - Restaurar respaldo

**Controladores:** `userController.js`, `networkController.js`, `auditController.js`, `backupController.js`

---

### 3. Ganar (Evangelismo)
Registro y seguimiento inicial de invitados.

**Página:**
- `Ganar.jsx` - Módulo de ganancias
- `PublicGuestRegistration.jsx` - Registro público de invitados

**Componentes Clave:**
- `GuestList.jsx` - Listado y filtros de invitados
- `GuestRegistrationForm.jsx` - Formulario de captación
- `GuestStats.jsx` - Estadísticas de nuevos invitados

**Funciones Backend:**
- `GET /guests` - Listar todos los invitados
- `GET /guests/:id` - Obtener invitado por ID
- `POST /guests` - Crear invitado
- `PUT /guests/:id` - Actualizar invitado
- `DELETE /guests/:id` - Eliminar invitado
- `POST /guests/:id/convert-to-member` - Convertir a miembro
- `POST /guests/:id/calls` - Registrar llamada
- `POST /guests/:id/visits` - Registrar visita
- `GET /guests/stats` - Estadísticas de invitados

**Controladores:** `guestController.js`, `guestStatsController.js`

---

### 4. Consolidar (Seguimiento)
Proceso de integración de invitados a la iglesia y seguimiento de asistencia.

**Página:**
- `Consolidar.jsx` - Módulo de consolidación

**Componentes Clave:**
- `GuestTracking.jsx` - Gestión de llamadas y visitas
- `ChurchAttendance.jsx` - Asistencia dominical
- `ConsolidatedStatsReport.jsx` - Reportes generales e indicadores KPI
- `ChurchAttendanceChart.jsx` - Gráficos históricos de asistencia
- `GuestTrackingStats.jsx` - Estadísticas de seguimiento

**Funciones Backend:**
- `POST /consolidar/church-attendance` - Registrar asistencia a culto
- `GET /consolidar/church-attendance/members/all` - Obtener todos los miembros
- `GET /consolidar/church-attendance/stats` - Estadísticas de asistencia
- `GET /consolidar/church-attendance/daily-stats` - Estadísticas diarias
- `GET /consolidar/church-attendance/:date` - Asistencia por fecha
- `GET /consolidar/stats/general` - Estadísticas generales
- `GET /consolidar/stats/seminar-by-leader` - Estadísticas de seminarios por líder
- `GET /consolidar/stats/guest-tracking` - Estadísticas de seguimiento de invitados

**Controladores:** `guestTrackingController.js`, `churchAttendanceController.js`, `consolidarStatsController.js`

---

### 5. Discipular (Escuela y Capacitación)
Gestión académica, cursos, seminarios y calificaciones.

**Página:**
- `Discipular.jsx` - Módulo de discipulado

**Componentes Clave:**
- `CapacitacionDestino.jsx` - Módulo de cursos
- `School/` - Carpeta de gestión de escuela de liderazgo
- `SeminarModuleList.jsx` - Listado de módulos
- `StudentProgress.jsx` - Kardex académico
- `ClassAttendanceTracker.jsx` - Control de asistencia a clases
- `EnrollmentPanel.jsx` - Panel de matriculación
- `EncuentroClassTracker.jsx` - Control de clases de encuentros

**Funciones Backend (Seminarios):**
- `GET /seminar/modules` - Listar módulos
- `POST /seminar/modules` - Crear módulo
- `PUT /seminar/modules/:id` - Actualizar módulo
- `DELETE /seminar/modules/:id` - Eliminar módulo
- `GET /seminar/modules/:id` - Obtener detalles del módulo
- `POST /seminar/:moduleId/enroll` - Matricular estudiante
- `DELETE /seminar/enrollments/:id` - Eliminar matriculación
- `GET /seminar/:moduleId/enrollments` - Obtener matriculaciones
- `PUT /seminar/enrollments/:enrollmentId/progress` - Actualizar progreso
- `POST /seminar/class-attendance` - Registrar asistencia a clase
- `GET /seminar/enrollments/:enrollmentId/attendances` - Obtener assistencias

**Funciones Backend (Escuela de Liderazgo):**
- `POST /school/modules` - Crear módulo de escuela
- `GET /school/modules` - Listar módulos
- `DELETE /school/modules/:id` - Eliminar módulo
- `PUT /school/modules/:id` - Actualizar módulo
- `GET /school/modules/:id/matrix` - Obtener matriz del módulo
- `POST /school/enroll` - Matricular en escuela
- `DELETE /school/enrollments/:enrollmentId` - Eliminar inscripción
- `POST /school/matrix/update` - Actualizar celda de matriz
- `GET /school/modules/:moduleId/materials` - Obtener materiales
- `POST /school/modules/:moduleId/materials/:classNumber` - Actualizar material
- `GET /school/stats/leader` - Estadísticas por líder
- `GET /school/student-matrix` - Matriz de estudiantes

**Funciones Backend (Matrículas):**
- `POST /consolidar/seminar/enrollments` - Matricular estudiante
- `GET /consolidar/seminar/enrollments/module/:moduleId` - Matrículas por módulo
- `GET /consolidar/seminar/enrollments/student/:userId` - Matrículas por estudiante
- `PUT /consolidar/seminar/enrollments/:id/status` - Actualizar estado

**Controladores:** `seminarController.js`, `schoolController.js`, `enrollmentController.js`, `classAttendanceController.js`

---

### 6. Enviar (Células)
Gestión de grupos pequeños (células), ubicaciones y asistencia.

**Página:**
- `Enviar.jsx` - Módulo de células

**Componentes Clave:**
- `CellManagement.jsx` - CRUD de células
- `CellMap.jsx` - Geolocalización de células
- `CellAttendance.jsx` - Reporte de asistencia

**Funciones Backend:**
- `POST /enviar/cells` - Crear célula
- `PUT /enviar/cells/:id` - Actualizar célula
- `DELETE /enviar/cells/:id` - Eliminar célula
- `POST /enviar/cells/:id/coordinates` - Actualizar coordenadas
- `POST /enviar/cells/assign` - Asignar miembro a célula
- `POST /enviar/cells/unassign` - Desasignar miembro
- `GET /enviar/cells` - Listar células
- `GET /enviar/cells/:cellId/members` - Miembros de célula
- `GET /enviar/eligible-leaders` - Líderes elegibles
- `GET /enviar/eligible-hosts` - Anfitriones elegibles
- `GET /enviar/eligible-members` - Miembros elegibles
- `GET /enviar/eligible-doce-leaders` - Líderes de 12 elegibles
- `POST /enviar/cell-attendance` - Registrar asistencia
- `GET /enviar/cell-attendance/:cellId/:date` - Asistencia por célula y fecha
- `GET /enviar/cell-attendance/stats` - Estadísticas de asistencia

**Controladores:** `cellController.js`, `cellAttendanceController.js`

---

### 7. Eventos (Encuentros y Convenciones)
Gestión de eventos masivos, registros y pagos.

**Páginas:**
- `Encuentros.jsx` - Gestión de encuentros
- `Convenciones.jsx` - Gestión de convenciones

**Componentes Clave:**
- `EncuentroDetails.jsx` - Gestión detallada de encuentro
- `ConventionDetails.jsx` - Gestión detallada de convención
- `BalanceReport.jsx` - Reporte financiero de evento

**Funciones Backend (Encuentros):**
- `GET /encuentros` - Listar encuentros
- `POST /encuentros` - Crear encuentro
- `GET /encuentros/:id` - Obtener encuentro
- `PUT /encuentros/:id` - Actualizar encuentro
- `DELETE /encuentros/:id` - Eliminar encuentro
- `GET /encuentros/:id/report/balance` - Reporte financiero
- `POST /encuentros/:encuentrosId/register` - Registrar participante
- `DELETE /encuentros/registrations/:registrationId` - Eliminar registro
- `POST /encuentros/registrations/:registrationId/payments` - Agregar pago
- `PUT /encuentros/registrations/:registrationId/classes/:classNumber` - Actualizar asistencia a clase

**Funciones Backend (Convenciones):**
- `GET /convenciones` - Listar convenciones
- `POST /convenciones` - Crear convención
- `GET /convenciones/:id` - Obtener convención
- `PUT /convenciones/:id` - Actualizar convención
- `DELETE /convenciones/:id` - Eliminar convención
- `GET /convenciones/:id/report/balance` - Reporte financiero
- `POST /convenciones/:conventionId/register` - Registrar participante
- `DELETE /convenciones/registrations/:registrationId` - Eliminar registro
- `POST /convenciones/registrations/:registrationId/payments` - Agregar pago

**Controladores:** `encuentroController.js`, `conventionController.js`

---

### 8. Metas
Establecimiento y seguimiento de objetivos por líder.

**Página:**
- `Metas.jsx` - Gestión de metas

**Funciones Backend:**
- `GET /goals` - Listar metas
- `POST /goals` - Crear/actualizar meta
- `PUT /goals/:id` - Actualizar meta
- `DELETE /goals/:id` - Eliminar meta

**Controlador:** `goalController.js`

---

### 9. Oración de Tres
Gestión de grupos de oración.

**Componentes Clave:**
- `OracionDeTresManagement.jsx` - Gestión de grupos de oración

**Funciones Backend:**
- `POST /oracion-de-tres` - Crear grupo
- `GET /oracion-de-tres` - Listar grupos
- `GET /oracion-de-tres/:id` - Obtener grupo por ID
- `PUT /oracion-de-tres/:id` - Actualizar grupo
- `DELETE /oracion-de-tres/:id` - Eliminar grupo
- `POST /oracion-de-tres/meeting` - Agregar reunión

**Controlador:** `oracionDeTresController.js`

---

### 10. Documentos Legales
Administración de documentos oficiales.

**Página:**
- `LegalDocuments.jsx` - Gestión de documentos legales

**Funciones Backend:**
- `GET /legal-documents` - Listar documentos
- `POST /legal-documents` - Crear documento
- `DELETE /legal-documents/:id` - Eliminar documento

**Controlador:** `legalDocumentController.js`

---

## Roles de Usuario

El sistema implementa un control de acceso basado en roles (RBAC):

| Rol | Descripción |
|-----|-------------|
| `ADMIN` | Control total del sistema |
| `PASTOR` | Gestión de su red completa |
| `LIDER_DOCE` | Líder principal de red (Los Doce) |
| `LIDER_CELULA` | Líder de grupo pequeño |
| `MIEMBRO` | Usuario base |

---

## Estructura de Directorios

### Client
```
client/src/
├── components/     # Componentes reutilizables y módulos específicos
│   ├── ui/         # Componentes de interfaz de usuario
│   └── School/    # Componentes de escuela de liderazgo
├── pages/         # Vistas principales (Rutas)
├── context/       # Contextos de React (Auth, Theme)
├── utils/         # Funciones auxiliares y configuración de API
└── App.jsx        # Configuración de Rutas y Layout
```

### Server
```
server/
├── controllers/    # Lógica de negocio
├── routes/         # Definición de endpoints API
├── middleware/     # Middlewares de autenticación y permisos
├── prisma/         # Esquema de base de datos y migraciones
├── utils/          # Helpers (Logger, etc.)
└── index.js        # Punto de entrada y configuración del servidor
```

---

## Rutas API Resumen

| Módulo | Prefijo | Métodos Principales |
|--------|---------|---------------------|
| Autenticación | `/auth` | setup, register, login, init-status |
| Usuarios | `/users` | CRUD, profile, password, assign-leader |
| Red | `/network` | los-doce, pastores, assign, remove |
| Invitados | `/guests` | CRUD, convert-to-member, calls, visits, stats |
| Consolidar | `/consolidar` | church-attendance, stats, seminar, enrollments |
| Seminarios | `/seminar` | modules, enroll, class-attendance |
| Escuela | `/school` | modules, matrix, enroll, materials |
| Células | `/enviar` | cells, attendance, eligible-* |
| Encuentros | `/encuentros` | CRUD, register, payments, balance |
| Convenciones | `/convenciones` | CRUD, register, payments, balance |
| Metas | `/goals` | CRUD |
| Oración de Tres | `/oracion-de-tres` | CRUD, meeting |
| Documentos | `/legal-documents` | CRUD |
| Auditoría | `/audit` | logs, stats, backup, restore |
