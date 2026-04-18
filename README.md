# Proyecto Iglesia - Sistema de Gestión Eclesiástica

## Descripción General

**Proyecto Iglesia** es una aplicación web de gestión eclesiástica completa (CRM) desarrollada para administrar los procesos de una congregación religiosa. El sistema cubre todo el ciclo de discipulado: desde la invitación y seguimiento de invitados hasta la formación de líderes.

### Funcionalidades Principales

- **Gestión de Usuarios y Roles**: Control de acceso basado en roles (ADMIN, PASTOR, LIDER_DOCE, LIDER_CELULA, DISCIPULO)
- **Módulo Ganar**: Registro y seguimiento de invitados
- **Módulo Discipular**: Escuela de liderazgo y capacitación
- **Módulo Enviar**: Gestión de células y asistencia
- **Módulo Consolidar**: Seguimiento e iglesia
- **Módulo Kids**: Programa infantil y juvenil
- **Módulo Escuela de Artes**: Clases de arte con gestión de pagos
- **Módulo Convenciones**: Convenciones anuales
- **Módulo Encuentros**: Pre y Pos encuentros

---

## Tecnologías

### Frontend
- **React** con Vite
- **Phosphor Icons** para iconografía
- **React Router** para navegación
- **Axios** para consumo de API
- **Recharts** para gráficos
- **XLSX** para exportación de datos
- **React Leaflet** para mapas

### Backend
- **Node.js** con Express
- **PostgreSQL** con Supabase
- **JWT** para autenticación
- **bcrypt** para encriptación

---

## Estructura del Proyecto

```
Proyecto_Iglesia/
├── client/                 # Aplicación React
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── pages/          # Páginas principales
│   │   ├── context/        # Contextos de React
│   │   ├── hooks/          # Hooks personalizados
│   │   ├── utils/          # Utilidades
│   │   ├── constants/      # Constantes del sistema
│   │   └── styles/         # Estilos globales
│   └── package.json
├── server/                 # API REST
│   ├── controllers/        # Controladores
│   ├── routes/             # Rutas
│   ├── middleware/         # Middlewares
│   ├── models/             # Modelos de datos
│   └── package.json
├── scripts/                # Scripts de utilidad
├── package.json            # Scripts globales
└── README.md               # Este archivo
```

---

## Roles del Sistema

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **ADMIN** | Administrador | Control total del sistema |
| **PASTOR** | Pastor | Liderazgo pastoral |
| **LIDER_DOCE** | Líder de 12 | Coordinador de red de células |
| **LIDER_CELULA** | Líder de Célula | Líder de célula grupal |
| **DISCIPULO** | Discípulo | Miembro en proceso de formación |

### Grupos de Roles

```javascript
ALL_LEADERS: [ADMIN, PASTOR, LIDER_DOCE, LIDER_CELULA]
CAN_MANAGE_USERS: [ADMIN, PASTOR, LIDER_DOCE]
CAN_VIEW_STATS: [ADMIN, PASTOR, LIDER_DOCE, LIDER_CELULA]
CAN_MANAGE_CELLS: [ADMIN, PASTOR, LIDER_DOCE]
CAN_MANAGE_GOALS: [ADMIN, PASTOR]
CAN_MANAGE_CLASSES: [ADMIN, LIDER_DOCE, LIDER_CELULA, DISCIPULO]
```

---

## Módulos del Sistema

### 1. Módulo Ganar
Gestión de invitados y seguimiento.
- Registro público de invitados
- Seguimiento de estados (Nuevo, Contactado, Consolidado, Ganado)
- Conversión de Guest a Miembro
- Oración de Tres
- Estadísticas

### 2. Módulo Discipular (Capacitación Destino)
Escuela de liderazgo con 6 cursos en 3 niveles.
- Gestión de clases y notas
- Matriz de estudiantes
- Reportes estadísticos por líder
- Niveles: 1A, 1B, 2A, 2B, 3A, 3B

### 3. Módulo Enviar
Gestión de células de la iglesia.
- Creación y edición de células
- Mapa de ubicación
- Registro de asistencia
- Estadísticas de asistencia

### 4. Módulo Consolidar
Seguimiento e iglesia.
- Asistencia a servicios
- Seguimiento de invitados (integrado con Ganar)
- Estadísticas de asistencia

### 5. Módulo Kids
Programa infantil y juvenil.
- Kids 1 (5-7 años)
- Kids 2 (8-10 años)
- Teens (11-13 años)
- Jóvenes (14+)
- Cronograma, clases y estadísticas

### 6. Escuela de Artes
Clases de arte con gestión financiera.
- Creación de clases
- Inscripción de estudiantes
- Control de pagos y abonos
- Asistencia
- Reportes

### 7. Convenciones
Gestión de convenciones anuales.
- Tipos: FAMILIAS, MUJERES, JOVENES, HOMBREES
- Inscripción y pagos
- Reportes de balance

### 8. Encuentros
Gestión de Pre y Pos encuentros.
- Tipos: HOMBREES, MUJERES, JOVENES
- Palabra Rhema
- Inscripción y pagos

---

## Sistema de Coordinadores

Cada módulo puede tener roles especiales:

| Rol | Descripción |
|-----|-------------|
| **Coordinator** | Responsable principal del módulo |
| **SubCoordinator** | Segundo responsable |
| **Treasurer** | Gestor financiero (para módulos con pagos) |

---

## Scripts Disponibles

```bash
# Iniciar ambos servidores (cliente + servidor)
npm start

# Iniciar solo el servidor
npm run server

# Iniciar solo el cliente
npm run client

# Instalar todas las dependencias
npm run install:all

# Scripts de base de datos
npm run backup          # Crear respaldo
npm run restore         # Restaurar respaldo

# Scripts de usuarios
npm run create-test-users    # Crear usuarios de prueba
npm run delete-test-users    # Eliminar usuarios de prueba
npm run verify-users         # Verificar usuarios
npm run check-roles          # Verificar roles
npm run manage-users         # Gestionar usuarios (menú interactivo)
npm run menu-usuarios        # Menú de usuarios

# Tests
npm run test:open    # Abrir Cypress
npm run test:run     # Ejecutar tests
```

---

## Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone <repositorio>
   cd Proyecto_Iglesia
   ```

2. **Instalar dependencias**:
   ```bash
   npm run install:all
   ```

3. **Configurar variables de entorno**:
   - Crear `.env` en `/server` con credenciales de Supabase
   - Crear `.env` en `/client` con URL de API

4. **Iniciar la aplicación**:
   ```bash
   npm start
   ```

5. **Acceder a la aplicación**:
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:5000`

---

## Documentación de Módulos

Para información detallada de cada módulo, consulte los documentos de anexo:

- [Anexo 1: Módulo Ganar](./Informe_Modulo_Ganar.md)
- [Anexo 2: Módulo Discipular](./Informe_Modulo_Discipular.md)
- [Anexo 3: Módulo Enviar](./Informe_Modulo_Enviar.md)
- [Anexo 4: Módulo Consolidar](./Informe_Modulo_Consolidar.md)
- [Anexo 5: Módulo Kids](./Informe_Modulo_Kids.md)
- [Anexo 6: Módulo Escuela de Artes](./Informe_Modulo_EscuelaDeArtes.md)
- [Anexo 7: Módulo Convenciones](./Informe_Modulo_Convenciones.md)
- [Anexo 8: Módulo Encuentros](./Informe_Modulo_Encuentros.md)

---

## Licencia

ISC - Benjamin Campuzano Castañeda

---

## Autor

**Benjamin Campuzano Castañeda**