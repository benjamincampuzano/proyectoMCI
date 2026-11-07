# SAST para JavaScript/JSX — `tools/sast`

Analizador **estático** de seguridad para el código JavaScript del proyecto.
No ejecuta el código auditado: lee cada fichero, lo convierte en un AST con
[acorn](https://github.com/acornjs/acorn) (+`acorn-jsx`) y aplica sobre el árbol
un modelo de **flujo de contaminación** (*taint tracking*): fuentes → propagadores
→ sumideros, con saneadores que cortan el flujo.

---

## Uso

```bash
# Análisis por defecto (client/src + server) según sast.config.json
pnpm run sast

# Rutas concretas
node tools/sast/sast.js client/src/pages server/controllers

# Informe JSON / SARIF (integrable en CI o GitHub Code Scanning)
pnpm run sast:json      # -> reports/sast-report.json
pnpm run sast:sarif     # -> reports/sast-report.sarif

# Sólo hallazgos de severidad alta o superior
node tools/sast/sast.js --min-severity high

# Código de salida 1 si hay hallazgos críticos (para CI)
node tools/sast/sast.js --fail-on high

# Catálogo de reglas
node tools/sast/sast.js --list-rules

# Pruebas del propio analizador
pnpm run sast:test
```

| Opción | Descripción |
|---|---|
| `--config <fichero>` | Fichero de configuración (por defecto `tools/sast/sast.config.json`) |
| `--format <fmt>` | `console` (por defecto), `json`, `sarif` |
| `--out <fichero>` | Escribe el informe en un fichero |
| `--min-severity <s>` | `critical`, `high`, `medium`, `low`, `info` |
| `--fail-on <s>` | Devuelve 1 si hay hallazgos de esa severidad o superior |
| `--no-config` | Ignora el fichero de configuración |
| `--list-rules` | Lista el catálogo de reglas |

## Configuración (`sast.config.json`)

```jsonc
{
  "include": ["client/src", "server"],
  "exclude": ["**/node_modules/**", "**/generated/**", "**/*.test.js", "..."],
  "rules": {
    "url.insecure": "off",      // "off" desactiva; "low"/"medium"/... ajusta la severidad
    "link.target-blank": "off"
  }
}
```

## Catálogo de reglas

### Fuentes de contaminación (`src.*`)

| Regla | Origen | Confianza |
|---|---|---|
| `src.req` | `req.body`, `req.query`, `req.params`, `req.headers`, `req.cookies` | alta |
| `src.location` | `location.search/hash/href`, `document.location` | alta |
| `src.storage` | `localStorage.getItem()`, `sessionStorage.getItem()` | alta |
| `src.cookie` | `document.cookie` | alta |
| `src.searchparams` | `new URLSearchParams()`, `useSearchParams()`, `searchParams.get()` | alta |
| `src.json` | `JSON.parse()` | media |
| `src.event` | `event.data` (mensajes `postMessage`) | media |
| `src.props` | `props` de un componente React | media |
| `src.routeparams` | `useParams()` | media |

### Saneadores (`san.*`)

`DOMPurify.sanitize`, `sanitize`, `escapeHtml`, `validator.escape`, `he.encode`,
`xss` (contexto HTML) y `encodeURIComponent`/`encodeURI` (contexto URL).
El saneo es **dependiente del contexto**: `DOMPurify.sanitize()` neutraliza un
sumidero HTML, pero no uno de código (`eval`) ni uno de URL.

### Sumideros

| Regla | Severidad | CWE | Descripción |
|---|---|---|---|
| `code.eval` | crítica | CWE-95 | `eval()` con dato no confiable |
| `code.function-constructor` | alta | CWE-95 | `new Function()` |
| `code.timer-string` | baja | CWE-95 | `setTimeout/setInterval` con cadena (eval implícito) |
| `xss.inner-html` | alta | CWE-79 | `innerHTML` / `outerHTML` / `srcdoc` |
| `xss.insert-adjacent-html` | alta | CWE-79 | `insertAdjacentHTML()` |
| `xss.document-write` | alta | CWE-79 | `document.write()` |
| `xss.set-attribute` | alta | CWE-79 | `setAttribute('href'\|'on*', ...)` |
| `xss.dangerously-set-inner-html` | alta | CWE-79 | `dangerouslySetInnerHTML` sin sanear |
| `xss.jsx-url` | media | CWE-79 | `href`/`src`/`action`/… con dato no confiable |
| `xss.server-response` | media | CWE-79 | `res.send()` con dato no confiable |
| `sql.raw-unsafe` | crítica | CWE-89 | `$queryRawUnsafe` / `$executeRawUnsafe` |
| `cmd.exec` | crítica | CWE-78 | `exec()`/`execSync()` con dato no confiable |
| `nosql.filter` | alta | CWE-943 | Filtro NoSQL construido con datos externos |
| `nosql.operator-injection` | media | CWE-943 | Operadores `$ne`, `$gt`, `$regex`, `$where`… |
| `proto.pollution` | alta | CWE-1321 | Clave dinámica en asignación (`obj[clave] = …`) |
| `redirect.location` | media | CWE-601 | Redirección a URL no confiable |
| `redirect.window-open` | media | CWE-601 | `window.open()` con URL no confiable |
| `postmessage.wildcard-origin` | media | CWE-346 | `postMessage(..., '*')` |
| `storage.sensitive` | media | CWE-922 | Credenciales en `localStorage`/`sessionStorage` |

### Reglas de patrón y semánticas

`auth.jwt-none`, `auth.jwt-decode`, `crypto.weak-random`, `cors.wildcard`,
`secret.hardcoded`, `secret.hardcoded-key`, `upload.unrestricted`,
`url.insecure`, `link.target-blank`, `cookie.insecure`, `regex.redos`,
`sanitizer.missing` (global: el proyecto no declara ningún saneador de HTML).

## Arquitectura

```
tools/sast/
├── sast.js              CLI: discovering de ficheros, configuración, informes, código de salida
├── sast.config.json     Rutas a analizar, exclusiones y ajustes por regla
├── lib/
│   ├── deps.js          Localiza acorn/acorn-jsx (store local de pnpm) sin instalar nada
│   ├── ast.js           Parseo (acorn + acorn-jsx) y recorrido genérico del AST
│   ├── rules.js         Catálogo: fuentes, saneadores, sumideros y reglas de patrón
│   ├── engine.js        Motor de flujo de contaminación y aplicación de reglas
│   └── report.js        Informes console / JSON / SARIF
└── test/
    ├── sast.test.js     15 pruebas sobre fixtures conocidos
    └── fixtures/        vulnerable.js / vulnerable.jsx
```

## Limitaciones conocidas

- Es un modelo de flujo **aproximado**: sigue la contaminación a nivel de
  sentencia y de ámbito, con punzamiento (*shadowing*) de variables. No
  resuelve alias, cierres ni flujos entre ficheros.
- La confianza de la fuente degrada la severidad: un dato que viene de `props`
  (confianza media) genera un hallazgo un nivel más bajo que uno de `req.body`.
- Los ficheros que no se pueden parsear se listan como *no analizados*: el
  informe es honesto sobre la cobertura, no la da por completa.
- No se detectan vulnerabilidades que no se manifesten en un patrón de código
  (lógica de negocio, autorización incorrecta, carreras, etc.).
