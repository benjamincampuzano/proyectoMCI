'use strict';

/**
 * Catálogo de reglas del SAST.
 *
 * Modelo de análisis: flujo de contaminación (taint) desde "fuentes" (datos que
 * controla un atacante o el usuario) hasta "sumideros" (puntos donde ese dato
 * se interpreta de forma peligrosa), con "saneadores" que cortan el flujo.
 *
 * Todo es estático: se analiza el AST, no se ejecuta el programa.
 */

const { memberPath, memberPropertyName, calleeName, literalValue } = require('./ast');

const SEVERITY = {
  critical: { rank: 4, label: 'CRÍTICO' },
  high: { rank: 3, label: 'ALTO' },
  medium: { rank: 2, label: 'MEDIO' },
  low: { rank: 1, label: 'BAJO' },
  info: { rank: 0, label: 'INFO' },
};

// ---------------------------------------------------------------------------
// Fuentes de contaminación
// ---------------------------------------------------------------------------

const REQ_SOURCES = ['body', 'query', 'params', 'headers', 'cookies', 'files', 'file'];

const SOURCES = [
  {
    id: 'src.req',
    label: 'cuerpo/consulta/parámetros de la petición HTTP',
    confidence: 'high',
    match(node) {
      if (node.type !== 'MemberExpression') return false;
      const path = memberPath(node);
      if (!path) return false;
      const parts = path.split('.');
      if (parts[0] !== 'req' && parts[0] !== 'request') return false;
      return REQ_SOURCES.includes(parts[1]);
    },
  },
  {
    id: 'src.location',
    label: 'URL/ubicación del navegador',
    confidence: 'high',
    match(node) {
      if (node.type !== 'MemberExpression') return false;
      const path = memberPath(node);
      if (!path) return false;
      return (
        /^(window\.)?location\.(search|hash|href|pathname)$/.test(path) ||
        /^(window\.)?document\.location$/.test(path)
      );
    },
  },
  {
    id: 'src.storage',
    label: 'almacenamiento web (localStorage/sessionStorage)',
    confidence: 'high',
    match(node) {
      if (node.type !== 'CallExpression') return false;
      const name = calleeName(node);
      return /^(window\.)?(local|session)Storage\.getItem$/.test(name);
    },
  },
  {
    id: 'src.cookie',
    label: 'cookies del documento',
    confidence: 'high',
    match(node) {
      if (node.type !== 'MemberExpression') return false;
      return memberPath(node) === 'document.cookie';
    },
  },
  {
    id: 'src.searchparams',
    label: 'parámetros de URL (URLSearchParams / useSearchParams)',
    confidence: 'high',
    match(node) {
      if (node.type === 'NewExpression') {
        return calleeName(node) === 'URLSearchParams';
      }
      if (node.type !== 'CallExpression') return false;
      const name = calleeName(node);
      if (name === 'URLSearchParams') return true;
      if (name === 'useSearchParams') return true;
      if (/searchParams\.get$/.test(name)) return true;
      return false;
    },
  },
  {
    id: 'src.json',
    label: 'resultado de JSON.parse (dato no validado)',
    confidence: 'medium',
    match(node) {
      return node.type === 'CallExpression' && calleeName(node) === 'JSON.parse';
    },
  },
  {
    id: 'src.event',
    label: 'datos recibidos por postMessage',
    confidence: 'medium',
    match(node) {
      if (node.type !== 'MemberExpression') return false;
      const path = memberPath(node);
      return /^(e|event|evt|messageEvent)\.data$/.test(path);
    },
  },
  {
    id: 'src.props',
    label: 'props del componente (podrían venir de la API)',
    confidence: 'medium',
    match(node) {
      if (node.type === 'Identifier') return node.name === 'props';
      if (node.type === 'MemberExpression') {
        const path = memberPath(node);
        return path === 'props' || (path && path.startsWith('props.'));
      }
      return false;
    },
  },
  {
    id: 'src.routeparams',
    label: 'parámetros de ruta (useParams)',
    confidence: 'medium',
    match(node) {
      return node.type === 'CallExpression' && calleeName(node) === 'useParams';
    },
  },
];

// ---------------------------------------------------------------------------
// Saneadores (cortan el flujo de contaminación según el contexto del sumidero)
// ---------------------------------------------------------------------------

const SANITIZERS = [
  {
    id: 'san.dompurify',
    label: 'DOMPurify.sanitize',
    contexts: ['html', 'url', 'text'],
    match(node) {
      if (node.type !== 'CallExpression') return false;
      const name = calleeName(node) || '';
      return /(^|\.)DOMPurify\.sanitize$/.test(name) || /(^|\.)sanitize$/.test(name);
    },
  },
  {
    id: 'san.escape',
    label: 'escape/sanitización de HTML',
    contexts: ['html', 'text'],
    match(node) {
      if (node.type !== 'CallExpression') return false;
      const name = calleeName(node) || '';
      return /(^|\.)(escapeHtml|escapeHTML|sanitizeHtml|sanitizeHTML|stripTags|htmlEscape)$/.test(name);
    },
  },
  {
    id: 'san.validator',
    label: 'validator.escape / he.encode',
    contexts: ['html', 'text'],
    match(node) {
      if (node.type !== 'CallExpression') return false;
      const name = calleeName(node) || '';
      return /(^|\.)(validator\.escape|he\.encode|xss)$/.test(name);
    },
  },
  {
    id: 'san.urlencode',
    label: 'encodeURIComponent',
    contexts: ['url'],
    match(node) {
      if (node.type !== 'CallExpression') return false;
      const name = calleeName(node) || '';
      return /^(encodeURIComponent|encodeURI)$/.test(name);
    },
  },
];

// ---------------------------------------------------------------------------
// Sumideros
// ---------------------------------------------------------------------------

const SINKS = {
  eval: {
    id: 'code.eval',
    severity: 'critical',
    cwe: 'CWE-95',
    context: 'code',
    title: 'Uso de eval() con contenido no confiable',
    fix: 'Sustituye eval() por parseo explícito (JSON.parse) o una tabla de acciones permitidas (lookup map).',
  },
  functionCtor: {
    id: 'code.function-constructor',
    severity: 'high',
    cwe: 'CWE-95',
    context: 'code',
    title: 'Constructor Function() con contenido no confiable',
    fix: 'Sustituye new Function() por una función o tabla de dispatch estática.',
  },
  timerString: {
    id: 'code.timer-string',
    severity: 'high',
    cwe: 'CWE-95',
    context: 'code',
    title: 'setTimeout/setInterval con cadena (equivalente a eval)',
    fix: 'Pasa siempre una función a setTimeout/setInterval, nunca una cadena.',
  },
  innerHTML: {
    id: 'xss.inner-html',
    severity: 'high',
    cwe: 'CWE-79',
    context: 'html',
    title: 'Escritura directa en innerHTML/outerHTML/srcdoc',
    fix: 'Usa textContent para texto; para HTML, sanea con DOMPurify.sanitize().',
  },
  insertAdjacentHTML: {
    id: 'xss.insert-adjacent-html',
    severity: 'high',
    cwe: 'CWE-79',
    context: 'html',
    title: 'Inyección de HTML con insertAdjacentHTML',
    fix: 'Construye nodos con createElement/textContent o sanea con DOMPurify.',
  },
  documentWrite: {
    id: 'xss.document-write',
    severity: 'high',
    cwe: 'CWE-79',
    context: 'html',
    title: 'Inyección de HTML con document.write/writeln',
    fix: 'Elimina document.write(); construye el DOM con APIs seguras.',
  },
  setAttribute: {
    id: 'xss.set-attribute',
    severity: 'high',
    cwe: 'CWE-79',
    context: 'html',
    title: 'setAttribute con atributo de URL o evento en línea',
    fix: 'Valida el esquema (http/https) y usa addEventListener en lugar de atributos on*.',
  },
  dangerouslySetInnerHTML: {
    id: 'xss.dangerously-set-inner-html',
    severity: 'high',
    cwe: 'CWE-79',
    context: 'html',
    title: 'React dangerouslySetInnerHTML con contenido no confiable',
    fix: 'Sanea con DOMPurify.sanitize() antes de asignar __html.',
  },
  jsxUrl: {
    id: 'xss.jsx-url',
    severity: 'medium',
    cwe: 'CWE-79',
    context: 'url',
    title: 'Atributo JSX de URL (href/src/action) con dato no confiable',
    fix: 'Valida el esquema (sólo http/https) antes de usarlo en href/src.',
  },
  openRedirect: {
    id: 'redirect.location',
    severity: 'medium',
    cwe: 'CWE-601',
    context: 'url',
    title: 'Redirección a URL controlada por el usuario',
    fix: 'Valida la URL contra una lista blanca de destinos permitidos.',
  },
  windowOpen: {
    id: 'redirect.window-open',
    severity: 'medium',
    cwe: 'CWE-601',
    context: 'url',
    title: 'window.open() con URL no confiable',
    fix: 'Valida la URL y añade noopener/noreferrer.',
  },
  sqlRaw: {
    id: 'sql.raw-unsafe',
    severity: 'critical',
    cwe: 'CWE-89',
    context: 'sql',
    title: 'Consulta SQL construida por concatenación ($queryRawUnsafe)',
    fix: 'Usa $queryRaw con tagged template (parámetros linked) o Prisma ORM.',
  },
  cmdExec: {
    id: 'cmd.exec',
    severity: 'critical',
    cwe: 'CWE-78',
    context: 'cmd',
    title: 'Ejecución de comandos del sistema con datos no confiables',
    fix: 'Usa execFile/spawn con array de argumentos (sin shell) y valida la entrada.',
  },
  nosqlQuery: {
    id: 'nosql.filter',
    severity: 'high',
    cwe: 'CWE-943',
    context: 'nosql',
    title: 'Filtro NoSQL construido con datos no confiables',
    fix: 'Valida los campos del filtro y usa comparaciones strictly tipadas (no $ne/$gt).',
  },
  nosqlOperator: {
    id: 'nosql.operator-injection',
    severity: 'medium',
    cwe: 'CWE-943',
    context: 'nosql',
    title: 'Posible inyección de operadores NoSQL ($ne, $gt, $regex...)',
    fix: 'Valida que los valores de filtro sean escalares del tipo esperado.',
  },
  prototypePollution: {
    id: 'proto.pollution',
    severity: 'high',
    cwe: 'CWE-1321',
    context: 'object',
    title: 'Posible contaminación de prototipo',
    fix: 'Rechaza las claves __proto__, constructor y prototype al copiar objetos.',
  },
  pathTraversal: {
    id: 'path.traversal',
    severity: 'high',
    cwe: 'CWE-22',
    context: 'path',
    title: 'Ruta de archivo construida con datos no confiables',
    fix: 'Normaliza la ruta (path.resolve) y comprueba que siga dentro del directorio base.',
  },
  postMessageStar: {
    id: 'postmessage.wildcard-origin',
    severity: 'medium',
    cwe: 'CWE-346',
    context: 'message',
    title: 'postMessage con origen "*"',
    fix: 'Envía el mensaje con un origen exacto (window.location.origin).',
  },
  storageSecret: {
    id: 'storage.sensitive',
    severity: 'medium',
    cwe: 'CWE-922',
    context: 'storage',
    title: 'Almacenamiento de credenciales en el navegador',
    fix: 'Guarda el token en una cookie HttpOnly/Secure en lugar de localStorage.',
  },
  responseHtml: {
    id: 'xss.server-response',
    severity: 'medium',
    cwe: 'CWE-79',
    context: 'html',
    title: 'Respuesta del servidor con dato no confiable (posible XSS reflejado)',
    fix: 'Envía siempre JSON con Content-Type application/json o sanea el HTML.',
  },
};

// ---------------------------------------------------------------------------
// Reglas basadas en patrones (no dependen del flujo de contaminación)
// ---------------------------------------------------------------------------

/**
 * Reglas de patrón evaluadas sobre el texto completo del fichero.
 *
 *  re            expresión regular de detección (global, para localizar la línea)
 *  requires      condición adicional que debe cumplirse en el fichero
 *  skipIf        si se cumple, el hallazgo se descarta (evita falsos positivos)
 *  downgradeIf   si se cumple, la severidad baja un nivel
 */
const PATTERN_RULES = [
  {
    id: 'code.eval-call',
    severity: 'high',
    cwe: 'CWE-95',
    title: 'Llamada a eval()',
    detail: 'eval() ejecuta código arbitrario; sólo es aceptable con literales constantes.',
    fix: 'Elimina eval() y usa una tabla de acciones permitidas (lookup map).',
    re: /(^|[^.\w])eval\s*\(/g,
    downgradeIf: /(^|[^.\w])eval\s*\(\s*(['"`][^'"`]*['"`]|\d+)\s*\)/,
  },
  {
    id: 'code.function-constructor',
    severity: 'medium',
    cwe: 'CWE-95',
    title: 'Constructor Function() dinámico',
    detail: 'new Function() equivale a eval() y no puede analizarse estáticamente.',
    fix: 'Sustituye por funciones declaradas o tablas de dispatch.',
    re: /new\s+Function\s*\(/g,
  },
  {
    id: 'secret.hardcoded-key',
    severity: 'high',
    cwe: 'CWE-798',
    title: 'Clave o token embebido en el código',
    detail: 'Las credenciales versionadas se filtran junto con el repositorio.',
    fix: 'Mueve el valor a variables de entorno (.env) y rota la credencial expuesta.',
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bAKIA[0-9A-Z]{16}\b|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    id: 'auth.jwt-none',
    severity: 'critical',
    cwe: 'CWE-347',
    title: 'JWT sin restricción de algoritmo (algorithms: ["none"])',
    detail: 'Aceptar "none" permite firmar tokens forjados.',
    fix: 'Fija algorithms: ["HS256"] (o RS256) y verifica siempre la firma.',
    re: /algorithms\s*:\s*\[\s*['"]none['"]\s*\]/g,
  },
  {
    id: 'auth.jwt-decode',
    severity: 'medium',
    cwe: 'CWE-345',
    title: 'jwt.decode() en lugar de jwt.verify()',
    detail: 'decode() no verifica la firma; sólo sirve para leer el payload.',
    fix: 'Usa jwt.verify() para toda decisión de autorización.',
    re: /jwt\s*\.\s*decode\s*\(/g,
  },
  {
    id: 'cors.wildcard',
    severity: 'medium',
    cwe: 'CWE-942',
    title: 'CORS permisivo (origin: "*" o reflection del origin)',
    detail: 'Permite que cualquier sitio lance peticiones autenticadas contra el API.',
    fix: 'Restringe `origin` a la lista de dominios permitidos.',
    re: /origin\s*:\s*['"]\*['"]|origin\s*:\s*true|Access-Control-Allow-Origin['"]\s*,\s*['"]\*/g,
  },
  {
    id: 'url.insecure',
    severity: 'low',
    cwe: 'CWE-319',
    title: 'URL en claro (http://) en contexto sensible',
    detail: 'El tráfico sin TLS expone credenciales y datos personales.',
    fix: 'Usa https:// y redirige http:// a https://.',
    re: /['"]http:\/\/[^'"\s]*['"]/g,
    requires: /(login|auth|token|password|api|admin|oauth)/i,
  },
  {
    id: 'upload.unrestricted',
    severity: 'medium',
    cwe: 'CWE-434',
    title: 'Subida de archivos sin restricciones',
    detail: 'Multer sin limits/fileFilter permite subir archivos arbitrarios o DoS por tamaño.',
    fix: 'Define limits.fileSize y fileFilter en la configuración de multer.',
    re: /multer\s*\(/g,
    skipIf: /limits\s*:/,
  },
];

/** Reglas de alcance global (se evaluan una vez sobre todo el proyecto). */
const GLOBAL_RULES = [
  {
    id: 'sanitizer.missing',
    severity: 'medium',
    cwe: 'CWE-79',
    title: 'El proyecto no declara ningún saneador de HTML (DOMPurify)',
    detail:
      'Se detectan sumideros de HTML (innerHTML / dangerouslySetInnerHTML) pero el proyecto no ' +
      'incluye una librería de saneado: todo HTML dinámico llega al DOM sin filtrar.',
    fix: 'Añade dompurify (npm i dompurify) y sanea todo HTML dinámico antes de insertarlo.',
  },
];

/** Reglas de JSX que sólo aplican a React (atributos de URL). */
const JSX_URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'action',
  'formAction',
  'poster',
  'data',
  'xlinkHref',
  'srcDoc',
  'background',
]);

module.exports = {
  SEVERITY,
  SOURCES,
  SANITIZERS,
  SINKS,
  PATTERN_RULES,
  GLOBAL_RULES,
  JSX_URL_ATTRIBUTES,
  memberPropertyName,
  literalValue,
};
