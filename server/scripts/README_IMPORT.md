# Script de Importación de Usuarios

Este script permite importar usuarios desde el archivo `BBDD_Prueba.md` a la base de datos del proyecto.

## Características

- ✅ Parseo automático del archivo Markdown
- ✅ Creación de usuarios con perfiles completos
- ✅ Hasheo seguro de contraseñas
- ✅ Establecimiento de relaciones jerárquicas
- ✅ Asignación de roles del sistema
- ✅ Manejo de duplicados y errores
- ✅ Detección automática de género basada en nombres

## Requisitos

- Node.js
- Base de datos PostgreSQL configurada
- Variables de entorno configuradas

## Instalación

Asegúrate de tener las dependencias necesarias:

```bash
npm install @prisma/client bcrypt
```

## Uso

### 1. Preparación

Asegúrate de que el archivo `BBDD_Prueba.md` esté en la raíz del proyecto (misma carpeta que `package.json`).

### 2. Ejecutar el script

```bash
# Desde la carpeta server
node scripts/importUsers.js
```

### 3. Verificar la importación

El script mostrará en consola:
- Usuarios creados exitosamente
- Relaciones jerárquicas establecidas
- Roles asignados
- Estadísticas finales

## Proceso de Importación

### 1. Parseo de Datos

El script lee el archivo `BBDD_Prueba.md` y extrae la siguiente información:
- Nombre completo
- Cédula
- Fecha de nacimiento
- Correo electrónico
- Contraseña
- Rol (LIDER_CELULA o DISCIPULO)
- Teléfono
- Dirección
- Ciudad
- Líder inmediato
- Líder 12

### 2. Creación de Usuarios

Para cada usuario, el script:
- Crea un registro en la tabla `User`
- Hashea la contraseña con bcrypt
- Crea un perfil en `UserProfile` con:
  - Nombre completo
  - Género (detectado automáticamente)
  - Tipo y número de documento
  - Fecha de nacimiento
  - Dirección y ciudad
  - Aceptación de políticas de datos

### 3. Relaciones Jerárquicas

Establece las relaciones en la tabla `UserHierarchy`:
- Conecta cada usuario con su líder inmediato
- Asigna el rol correspondiente (LIDER_CELULA o DISCIPULO)

### 4. Roles del Sistema

Crea y asigna roles en las tablas `Role` y `UserRole`:
- `LIDER_CELULA` para líderes de célula
- `DISCIPULO` para discípulos

## Manejo de Errores

- **Duplicados**: Si un usuario con el mismo email ya existe, lo salta y continúa
- **Relaciones duplicadas**: Ignora relaciones jerárquicas ya existentes
- **Fechas inválidas**: Si una fecha no puede parsearse, la deja como null
- **Líder no encontrado**: Si un líder no está en la lista, la relación no se crea

## Estructura de Archivos

```
server/
├── scripts/
│   └── importUsers.js          # Script principal
├── prisma/
│   └── schema.prisma          # Esquema de base de datos
├── BBDD_Prueba.md             # Archivo de datos (debe estar aquí)
└── package.json
```

## Datos Importados

El script importa 166 usuarios con la siguiente distribución:
- **Líderes de célula**: ~40 usuarios
- **Discípulos**: ~126 usuarios
- **Ciudades**: Manizales, Villamaria, Arauca, Chinchina, Neira
- **Redes**: Varias redes jerárquicas con líderes 12

## Notas Importantes

1. **Contraseñas**: Todas las contraseñas son hasheadas con bcrypt (10 rounds)
2. **Género**: Se detecta automáticamente basado en una lista de nombres femeninos
3. **Documentos**: Todos se tratan como tipo 'CC' (Cédula de Ciudadanía)
4. **Políticas de datos**: Se marcan como aceptadas por defecto
5. **Usuarios activos**: Todos se crean como activos por defecto

## Personalización

### Agregar nuevos nombres para detección de género

Edita la función `determineSex()` en el script y agrega nombres a los arrays `femaleNames` o `maleNames`.

### Modificar roles del sistema

Edita la función `mapRole()` para agregar nuevos mapeos de roles.

### Cambiar formato de fechas

Modifica los regex en la función `parseBirthDate()` para soportar otros formatos.

## Solución de Problemas

### Error: "Usuario ya existe"
- Es normal si ejecutas el script múltiples veces
- El script continuará con los demás usuarios

### Error: "Líder no encontrado"
- Verifica que los nombres de líderes coincidan exactamente
- Los nombres deben ser idénticos a como aparecen en la columna

### Error: "Conexión a base de datos"
- Verifica que las variables de entorno estén configuradas
- Asegúrate de que PostgreSQL esté corriendo

## Post-Importación

Después de la importación, puedes:
1. Verificar los usuarios en la base de datos
2. Revisar las relaciones jerárquicas
3. Validar que los roles se asignaron correctamente
4. Probar el login con algunos usuarios

## Seguridad

- Las contraseñas se hashean antes de almacenarlas
- No se almacenan datos sensibles en logs
- El script maneja errores sin exponer información confidencial
