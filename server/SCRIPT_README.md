# Script de Creación de Usuarios de Prueba

## Descripción
Este script permite crear usuarios de prueba a partir del archivo `BBDD_Prueba.md`, estableciendo automáticamente las jerarquías de discipulado según la estructura del archivo.

## Características
- ✅ Parseo automático del archivo `BBDD_Prueba.md`
- ✅ Creación de usuarios con perfiles completos
- ✅ Asignación de roles (PASTOR, LIDER_DOCE, LIDER_CELULA, DISCIPULO, MIEMBRO)
- ✅ Establecimiento de jerarquías de discipulado
- ✅ Hasheo automático de contraseñas
- ✅ Manejo de usuarios existentes (no duplica)
- ✅ Creación automática de roles y permisos básicos

## Uso

### 1. Ejecutar el script
```bash
cd server
node createTestUsers.js
```

### 2. Verificar resultados
El script mostrará en consola:
- Usuarios encontrados en el archivo
- Usuarios creados
- Jerarquías establecidas
- Errores si los hay

### 3. Iniciar sesión
Los usuarios creados podrán iniciar sesión con:
- **Email**: El especificado en el archivo BBDD_Prueba.md
- **Contraseña**: La especificada en el archivo (sin el asterisco *)

## Estructura del BBDD_Prueba.md
El script espera el siguiente formato:
```
| Ciudad     | Líder Inmediato | Líder 12 | Nombre Completo | CC | Fecha Nacimiento | Email | Contraseña | Rol | Teléfono | Dirección |
|------------|-----------------|----------|-----------------|----|------------------|-------|------------|-----|----------|-----------|
| Manizales  | Juan Pérez      | María Gómez | Carlos López | 12345678 | 15/01/1980 | carlos@gmail.com | Ministerio1234* | LIDER_CELULA | 3001234567 | Calle 1 #2-3 |
```

## Mapeo de Roles
- `PASTOR` → `PASTOR`
- `LIDER_DOCE` → `LIDER_DOCE`
- `LIDER_CELULA` → `LIDER_CELULA`
- `DISCIPULO` → `DISCIPULO`
- `INVITADO` → `MIEMBRO` (mapeado automáticamente)

## Notas Importantes
- El script no modifica usuarios existentes
- Las contraseñas se hashean automáticamente con bcrypt
- Las jerarquías se establecen basadas en la columna "Líder Inmediato"
- Los usuarios se marcan como activos y con políticas de datos aceptadas
- El script es idempotente (puede ejecutarse múltiples veces sin problemas)

## Troubleshooting

### Error: "Archivo no encontrado"
Asegúrate que el archivo `BBDD_Prueba.md` esté en el directorio raíz del proyecto.

### Error: "Permiso denegado"
Verifica que tienes los permisos necesarios en la base de datos.

### Error: "Usuario ya existe"
Esto es normal, el script omite usuarios existentes.

## Personalización
Puedes modificar el script para:
- Cambiar el mapeo de roles
- Ajustar el parseo de fechas
- Modificar los permisos por defecto
- Agregar validaciones adicionales
