# Plan de Refactorización de Componentes - Proyecto Iglesia

## Resumen Ejecutivo

**Total de componentes identificados:** ~70 archivos JSX  
**Problemas críticos encontrados:** 2 duplicados, 3+ componentes huérfanos, 4 componentes micro  
**Tiempo estimado:** 4-6 fases de trabajo

---

## Fase 1: Consolidación de Duplicados CRÍTICOS (Prioridad Máxima)

### 1.1 Unificar DataTable
**Problema:** Existen dos DataTables:
- `@/components/DataTable.jsx` (5,101 bytes) - DataTable básico
- `@/components/ui/DataTable.jsx` (11,281 bytes) - DataTable completo con UI Kit

**Impacto:** Ambos se importan en diferentes lugares, causando inconsistencias visuales y duplicación de código.

**Referencias encontradas:**
- `components/DataTable.jsx` se usa en: (verificar uso real)
- `components/ui/DataTable.jsx` se exporta en `ui/index.js` y se usa en `AuditDashboard.jsx`

**Tareas:**
1. Identificar todas las importaciones de `components/DataTable.jsx`
2. Migrar esos usos a `components/ui/DataTable.jsx`
3. Verificar compatibilidad de props entre ambos
4. Eliminar `components/DataTable.jsx`
5. Actualizar imports en archivos afectados

**Criterios de aceptación:**
- [ ] No quedan imports a `@/components/DataTable.jsx`
- [ ] Todas las tablas funcionan correctamente
- [ ] No hay regresiones visuales

---

### PROMPT PARA FASE 1.1

```
Contexto: Estoy refactorizando un proyecto React. Existen dos componentes DataTable duplicados:

1. Archivo a ELIMINAR: /components/DataTable.jsx (5KB)
2. Archivo a CONSERVAR: /components/ui/DataTable.jsx (11KB)

Tu tarea:
1. Busca TODOS los archivos que importen from '../DataTable' o from '@/components/DataTable'
2. Por cada archivo encontrado:
   - Verifica si las props usadas existen en /components/ui/DataTable.jsx
   - Si hay diferencias de props, ajusta el código consumidor o documenta la incompatibilidad
   - Cambia el import a: import DataTable from '@/components/ui/DataTable' o from '../ui/DataTable'
3. Asegúrate de que UserTable.jsx (que usa DataTable) siga funcionando correctamente después del cambio
4. NO elimines el archivo DataTable.jsx todavía, solo deja comentado al final: // TODO: Eliminar tras verificación

Restricciones:
- NO modifiques la lógica interna de los componentes que usan DataTable
- Solo cambia las rutas de importación
- Si encuentras incompatibilidades de props, lista los archivos y las props conflictivas

Entregable: Lista de archivos modificados con sus nuevos imports, y lista de incompatibilidades encontradas (si hay).
```

---

### 1.2 Consolidar Modales de Cambio de Contraseña
**Problema:** Dos modales similares:
- `@/components/ChangePasswordModal.jsx` (15,039 bytes) - Usado en App.jsx
- `@/components/auth/PasswordChangeModal.jsx` (12,225 bytes) - ¿Usado?

**Tareas:**
1. Identificar si `auth/PasswordChangeModal.jsx` se usa en algún lugar
2. Comparar funcionalidad entre ambos
3. Conservar el más completo/actualizado
4. Migrar usos y eliminar el duplicado

---

### PROMPT PARA FASE 1.2

```
Contexto: Tengo dos modales de cambio de contraseña duplicados:

1. /components/ChangePasswordModal.jsx (15KB) - Importado en App.jsx
2. /components/auth/PasswordChangeModal.jsx (12KB) - Estado desconocido

Tu tarea:
1. Busca TODOS los imports de PasswordChangeModal o ChangePasswordModal en el proyecto
2. Identifica qué archivos usan cada versión
3. Compara ambos archivos y determina:
   - Cuál tiene más funcionalidades
   - Cuál usa las mejores prácticas
   - Cuál está más actualizado
4. Propón cuál conservar y por qué
5. Si hay funcionalidades únicas en el modal que se eliminará, documenta qué hay que migrar

Restricciones:
- NO elimines ningún archivo todavía
- Solo investiga y compara
- Lista todos los archivos que importan cada modal

Entregable: 
- Tabla comparativa de funcionalidades
- Recomendación de cuál conservar
- Lista de archivos que necesitarán actualización de imports
- Lista de funcionalidades a migrar (si aplica)
```

---

## Fase 2: Limpieza de Componentes Huérfanos (Prioridad Alta)

### 2.1 Evaluar ThemeToggle.jsx
**Problema:** `@/components/ThemeToggle.jsx` (1,143 bytes) existe pero no se importa en App.jsx.

**Preguntas a resolver:**
- ¿Se usa en algún layout o componente interno?
- ¿Está obsoleto tras migrar a ThemeContext?
- ¿Debe integrarse en la Navigation?

---

### PROMPT PARA FASE 2.1

```
Contexto: Tengo un componente ThemeToggle.jsx que parece no usarse:

Archivo: /components/ThemeToggle.jsx (1KB)
Estado: No importado en App.jsx

Tu tarea:
1. Busca TODOS los imports de ThemeToggle en el proyecto (cualquier variación: ThemeToggle, Theme, Toggle, etc.)
2. Si NO se encuentra en ningún lado:
   - Verifica si el proyecto usa ThemeContext (revisa /context/ThemeContext.jsx)
   - Compara la funcionalidad de ThemeToggle con ThemeContext
   - Determina si ThemeToggle es redundante o es una versión alternativa
3. Si SÍ se encuentra en uso:
   - Documenta dónde y cómo se usa
   - Evalúa si la implementación es correcta

Restricciones:
- NO elimines el archivo todavía
- Solo investiga su uso y relación con ThemeContext

Entregable:
- Lista de archivos que usan ThemeToggle (vacía si no se usa)
- Análisis: ¿Es redundante con ThemeContext? ¿Debe conservarse? ¿Integrarse en Navigation?
- Recomendación final: Eliminar / Conservar / Integrar
```

---

### 2.2 Evaluar CapacitacionDestino.jsx
**Problema:** `@/components/CapacitacionDestino.jsx` (2,320 bytes) - muy pequeño, posible placeholder.

**Tareas:**
1. Verificar si se importa en algún lugar
2. Si no se usa, marcar para eliminación

---

### PROMPT PARA FASE 2.2

```
Contexto: Componente sospechoso de estar sin uso:

Archivo: /components/CapacitacionDestino.jsx (2.3KB)
Tamaño: Muy pequeño para un componente completo

Tu tarea:
1. Busca TODOS los imports de CapacitacionDestino en el proyecto
2. Revisa el contenido del archivo:
   - ¿Es un componente funcional completo?
   - ¿Es solo un placeholder/placeholder?
   - ¿Qué props recibe?
3. Si NO se usa en ningún lado: marca para eliminación
4. Si SÍ se usa: documenta dónde

Restricciones:
- NO elimines el archivo
- Solo investiga y reporta

Entregable:
- Lista de archivos que lo importan (si hay)
- Contenido resumido del componente (qué hace, props principales)
- Recomendación: Eliminar / Mantener / Revisar contenido
```

---

### 2.3 Evaluar CellMap.jsx
**Problema:** `@/components/CellMap.jsx` (4,373 bytes) - ¿Usado en CellManagement?

---

### PROMPT PARA FASE 2.3

```
Contexto: Verificar uso de componente:

Archivo: /components/CellMap.jsx (4KB)
Relación esperada: /components/CellManagement.jsx (103KB)

Tu tarea:
1. Busca TODOS los imports de CellMap en el proyecto
2. Si se usa en CellManagement.jsx:
   - Verifica que la importación sea correcta
   - Documenta cómo se usa (qué props recibe, dónde se renderiza)
3. Si NO se usa en CellManagement.jsx ni en otros lados:
   - Investiga si hay un mapa alternativo en CellManagement
   - Determina si CellMap es un componente huérfano

Restricciones:
- NO modifiques el código
- Solo investiga imports y uso

Entregable:
- Lista de archivos que importan CellMap
- Si se usa: resumen de su uso
- Si no se usa: investigación de alternativas en CellManagement
- Recomendación: Integrar / Eliminar / Mantener
```

---

## Fase 3: Consolidación de Componentes Micro (Prioridad Media)

### 3.1 Integrar componentes < 1KB
**Problemas identificados:**
- `ConnectivityHandler.jsx` (945 bytes) - Manejo de conectividad
- `LazyCharts.jsx` (943 bytes) - Wrapper de lazy loading
- `TransitionLoader.jsx` (785 bytes) - Loader de transición
- `UnassignedUsersPanel.jsx` (1,319 bytes) - Panel muy simple

**Estrategia:** Integrar en componentes padre o mantener si tienen propósito específico.

---

### PROMPT PARA FASE 3.1

```
Contexto: Tengo 4 componentes muy pequeños que podrían integrarse:

1. ConnectivityHandler.jsx (945 bytes) - importado en App.jsx
2. LazyCharts.jsx (943 bytes) - verificar uso
3. TransitionLoader.jsx (785 bytes) - importado en App.jsx
4. UnassignedUsersPanel.jsx (1319 bytes) - en /components/unassigned/

Tu tarea:
Para cada componente:
1. Busca todos sus imports
2. Analiza su código:
   - ¿Es un wrapper simple?
   - ¿Tiene estado propio?
   - ¿Se reutiliza en múltiples lugares?
3. Determina si es candidato a:
   - A) Integrarse en su componente padre (inline)
   - B) Mantenerse como componente separado (reutilización)
   - C) Fusionarse con componente similar

Análisis específico:
- ConnectivityHandler: ¿Puede ir directamente en App.jsx? ¿Tiene estado complejo?
- TransitionLoader: ¿Se usa solo en App.jsx? ¿Puede fusionarse con LoadingOverlay?
- LazyCharts: ¿Dónde se usa? ¿Es necesario como wrapper separado?
- UnassignedUsersPanel: ¿Se usa con UnassignedUsersModal? ¿Puede fusionarse?

Restricciones:
- NO hagas cambios todavía
- Solo análisis y recomendación

Entregable:
Tabla con:
| Componente | Tamaño | Usos encontrados | Recomendación | Justificación |
```

---

## Fase 4: Reorganización de Utilidades (Prioridad Media-Baja)

### 4.1 Mover utilidades JS fuera de /components
**Problema:** Archivos de utilidad en carpeta de componentes:
- `@/components/utils/buildHierarchy.js`
- `@/components/utils/permissions.js`
- `@/components/utils/transformCouples.js`
- `@/components/utils/unassigned.js`

**Destino:** `@/utils/` o `@/lib/`

---

### PROMPT PARA FASE 4.1

```
Contexto: Reorganización de archivos de utilidad:

Archivos a mover:
- /components/utils/buildHierarchy.js (7KB)
- /components/utils/permissions.js (1.4KB)
- /components/utils/transformCouples.js (4.7KB)
- /components/utils/unassigned.js (599 bytes)

Destino propuesto: /utils/ (ya existe en el proyecto)

Tu tarea:
1. Verifica si existe /utils/ y qué archivos tiene
2. Para cada archivo en /components/utils/:
   - Busca TODOS los imports en el proyecto
   - Documenta cuántos archivos lo importan
   - Identifica el tipo de funciones que exporta (helpers, transformaciones, etc.)
3. Crea un plan de migración:
   - Nueva ruta para cada archivo
   - Actualización de imports necesaria
4. Determina orden de migración (de menos a más dependencias)

Restricciones:
- NO muevas archivos todavía
- Solo planifica y documenta
- Considera si /utils/ es el mejor destino o si debería ser /lib/

Entregable:
- Lista de dependencias por archivo (quién lo importa)
- Plan de migración con rutas propuestas
- Orden recomendado de migración
- Conteo de archivos afectados por cada cambio de ruta
```

---

## Fase 5: Limpieza Final (Prioridad Baja)

### 5.1 Eliminar MobileDebugger
**Problema:** `@/components/MobileDebugger.jsx` (5,968 bytes) - Comentado en App.jsx, solo para desarrollo.

**Tareas:**
1. Confirmar que está completamente comentado en App.jsx
2. Verificar si hay referencias en otros lugares
3. Eliminar archivo y referencias comentadas

---

### PROMPT PARA FASE 5.1

```
Contexto: Eliminación de componente de debugging:

Archivo: /components/MobileDebugger.jsx (6KB)
Estado en App.jsx: 
- Línea 13: // import MobileDebugger from './components/MobileDebugger';
- Línea 237: {/* <MobileDebugger /> */}

Tu tarea:
1. Verifica que MobileDebugger esté completamente comentado en App.jsx (busca cualquier uso no comentado)
2. Busca cualquier otra referencia a MobileDebugger en el proyecto
3. Si está todo comentado/no usado:
   - Documenta las líneas exactas a eliminar en App.jsx
   - Prepara lista de limpieza

Restricciones:
- NO elimines archivos todavía
- Solo confirma que es seguro eliminar

Entregable:
- Confirmación de estado (¿totalmente comentado?)
- Lista de archivos a eliminar
- Líneas específicas a limpiar en App.jsx
- Advertencias si encuentras algún uso activo
```

---

## Fase 6: Verificación de UI Kit (Prioridad Baja)

### 6.1 Evaluar CommandPalette
**Problema:** `@/components/ui/CommandPalette.jsx` (10,798 bytes) - ¿Se usa realmente?

**Tareas:**
1. Buscar usos de CommandPalette
2. Si no se usa, evaluar si vale la pena mantenerlo para uso futuro

---

### PROMPT PARA FASE 6.2

```
Contexto: Evaluación de componente de UI Kit:

Archivo: /components/ui/CommandPalette.jsx (11KB)
UI Kit: Exportado en /components/ui/index.js

Tu tarea:
1. Busca TODOS los imports de CommandPalette en el proyecto (fuera de index.js)
2. Si se usa:
   - Documenta dónde y cómo
   - Verifica que la implementación esté completa
3. Si NO se usa:
   - Evalúa el componente: ¿está bien implementado? ¿tiene potencial de uso?
   - Decide: ¿Mantener para uso futuro? ¿Eliminar?

Restricciones:
- NO elimines todavía
- Evalúa calidad del código además del uso

Entregable:
- Lista de usos encontrados (si hay)
- Evaluación de calidad del código (completo, bien estructurado, etc.)
- Recomendación: Mantener / Eliminar / Implementar en alguna vista
```

---

## Checklist General de Verificación

Después de completar todas las fases, verificar:

- [ ] No quedan archivos duplicados
- [ ] No quedan componentes huérfanos sin evaluar
- [ ] Todos los imports apuntan a rutas correctas
- [ ] La aplicación compila sin errores
- [ ] Las tablas funcionan correctamente
- [ ] Los modales de contraseña funcionan
- [ ] No hay regresiones visuales
- [ ] El proyecto pasa el linter (npm run lint)

---

## Notas para el Ejecutor

1. **Trabajar una fase a la vez** - No saltar entre fases
2. **Probar después de cada fase** - Especialmente las fases 1 y 2
3. **Mantener commits atómicos** - Un commit por fase completada
4. **Documentar incompatibilidades** - Si algo no puede migrarse fácilmente
5. **Revisar tests** - Si existen tests, actualizar imports allí también

---

## Métricas de Éxito

| Métrica | Antes | Después | Meta |
|---------|-------|---------|------|
| Total archivos JSX en /components | ~70 | < 65 | -5 o más |
| Duplicados | 2 | 0 | 0 |
| Componentes huérfanos | 4+ | ≤1 | mínimo |
| Componentes < 1KB | 4 | ≤2 | reducir |
| Utilidades en /components | 4 | 0 | 0 |
