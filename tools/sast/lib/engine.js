'use strict';

/**
 * Motor de análisis estático.
 *
 * 1. Recorre el AST de cada fichero.
 * 2. Mantiene un ámbito (scope) por función/bloque y anota qué variables
 *    reciben datos no confiables ("taint").
 * 3. Comprueba cada "sumidero" (sink) para ver si el dato no confiable llega
 *    hasta él, aplicando los saneadores declarados.
 * 4. Aplica reglas de patrón sobre el texto fuente y sobre el AST.
 *
 * El código del proyecto NUNCA se ejecuta: sólo se parsea.
 */

const fs = require('fs');
const path = require('path');

const {
  walk,
  memberPath,
  memberPropertyName,
  calleeName,
  literalValue,
  sourceText,
  parseFile,
  relativePath,
} = require('./ast');
const { SEVERITY, SOURCES, SANITIZERS, SINKS, PATTERN_RULES, JSX_URL_ATTRIBUTES } = require('./rules');

const NO_TAINT = null;

const NOSQL_METHODS = new Set([
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'updateOne',
  'updateMany',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'countDocuments',
  'aggregate',
  'distinct',
]);

const NOSQL_OPERATORS = ['$where', '$ne', '$gt', '$gte', '$lt', '$lte', '$regex', '$in', '$nin', '$expr', '$function'];

const STORAGE_SENSITIVE = /(token|password|passwd|secret|jwt|session|credential|api[_-]?key)/i;

const PLACEHOLDER_SECRETS = /^(process\.env|import\.meta\.env|your|changeme|example|placeholder|xxx|\.\.\.)/i;

// ---------------------------------------------------------------------------
// Ámbitos
// ---------------------------------------------------------------------------

class Scope {
  constructor(parent, kind) {
    this.parent = parent;
    this.kind = kind;
    this.taints = new Map();
  }

  lookup(name) {
    let scope = this;
    while (scope) {
      if (scope.taints.has(name)) return scope.taints.get(name);
      scope = scope.parent;
    }
    return null;
  }

  declare(name, info) {
    // `tainted: false` también se registra: así una variable interna
    // sombrea a una homónima contaminada de un ámbito externo.
    this.taints.set(name, info);
  }
}

// ---------------------------------------------------------------------------
// Utilidades de coincidencia
// ---------------------------------------------------------------------------

function matchSource(node) {
  if (!node) return null;
  for (const source of SOURCES) {
    let ok = false;
    try {
      ok = source.match(node);
    } catch (_err) {
      ok = false;
    }
    if (ok) return source;
  }
  return null;
}

function matchSanitizer(node, context) {
  if (!node || node.type !== 'CallExpression') return null;
  for (const sanitizer of SANITIZERS) {
    if (!sanitizer.contexts.includes(context)) continue;
    let ok = false;
    try {
      ok = sanitizer.match(node);
    } catch (_err) {
      ok = false;
    }
    if (ok) return sanitizer;
  }
  return null;
}

/** Primer saneador que encaja con la llamada, sea cual sea el contexto. */
function matchAnySanitizer(node) {
  if (!node || node.type !== 'CallExpression') return null;
  for (const sanitizer of SANITIZERS) {
    let ok = false;
    try {
      ok = sanitizer.match(node);
    } catch (_err) {
      ok = false;
    }
    if (ok) return sanitizer;
  }
  return null;
}

function isCollectionReceiver(node) {
  if (!node) return false;
  if (node.type === 'Identifier') {
    return /(Model|Collection|Repository|Repo|Store)$/.test(node.name) || /^(db|database|conn|mongo|mongoose)$/i.test(node.name);
  }
  if (node.type === 'MemberExpression') {
    const path = memberPath(node);
    if (!path) return false;
    return /^(db|database|conn|mongoose|mongo)\b/.test(path) || /\.(collection|db)$/.test(path);
  }
  if (node.type === 'CallExpression') {
    const name = calleeName(node);
    return /^(mongoose|db)\.(model|collection)$/.test(name);
  }
  return false;
}

/** ¿La expresión empieza por un esquema de URL considerado seguro? */
function hasSafeUrlScheme(expr) {
  if (!expr) return false;
  let text = null;
  if (expr.type === 'TemplateLiteral' && expr.quasis.length > 0) {
    text = expr.quasis[0].value.cooked;
  } else if (expr.type === 'Literal' && typeof expr.value === 'string') {
    text = expr.value;
  }
  if (typeof text !== 'string') return false;
  return /^(https?:\/\/|mailto:|blob:|tel:)/i.test(text.trim());
}

/** Nombres de funciones declaradas o asignadas en el fichero. */
function collectFunctionNames(ast) {
  const names = new Set();
  walk(ast, {
    enter: (node) => {
      if (node.type === 'FunctionDeclaration' && node.id && node.id.name) {
        names.add(node.id.name);
        return;
      }
      if (node.type === 'VariableDeclarator' && node.id && node.id.type === 'Identifier') {
        if (node.init && (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression')) {
          names.add(node.id.name);
        }
      }
      if (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression'
      ) {
        for (const param of node.params || []) {
          if (param.type === 'Identifier') names.add(param.name);
        }
      }
    },
  });
  return names;
}

/** ¿La expresión produce una URL blob: local (URL.createObjectURL)? */
function isBlobUrlFactory(expr) {
  if (!expr) return false;
  if (expr.type === 'CallExpression') {
    const name = calleeName(expr) || '';
    return /(URL|window\.URL)\.createObjectURL$/.test(name);
  }
  if (expr.type === 'MemberExpression') {
    return /createObjectURL$/.test(memberPropertyName(expr) || '');
  }
  return false;
}

function isDocumentCookieSet(node) {
  return node.type === 'AssignmentExpression' && memberPath(node.left) === 'document.cookie';
}

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------

class Engine {
  constructor(options = {}) {
    this.rootDir = options.rootDir;
    this.findings = [];
    this.stats = {
      files: 0,
      parsed: 0,
      unparsed: 0,
      lines: 0,
      rules: new Set(),
    };
    this.disabledRules = new Set(options.disabledRules || []);
    this.severityOverrides = options.severityOverrides || {};
    this.useProjectConfig = options.useProjectConfig !== false;
    this.projectHasSanitizer = false;
  }

  addFinding(finding) {
    if (this.disabledRules.has(finding.ruleId)) return;
    const override = this.severityOverrides[finding.ruleId];
    if (override) {
      finding.severity = override;
      finding.severityLabel = SEVERITY[override].label;
    }
    const key = `${finding.ruleId}|${finding.file}|${finding.line}|${finding.column}|${finding.message}`;
    if (this.findings.some((f) => `${f.ruleId}|${f.file}|${f.line}|${f.column}|${f.message}` === key)) return;
    this.findings.push(finding);
    this.stats.rules.add(finding.ruleId);
  }

  // -- taint ---------------------------------------------------------------

  get currentFunctionName() {
    if (!this.functionStack || !this.functionStack.length) return null;
    for (let i = this.functionStack.length - 1; i >= 0; i--) {
      if (this.functionStack[i]) return this.functionStack[i];
    }
    return null;
  }

  taintOf(node, scope, context) {
    if (!node) return NO_TAINT;

    switch (node.type) {
      case 'Literal':
      case 'TemplateElement':
      case 'JSXText':
      case 'JSXEmptyExpression':
        return NO_TAINT;

      case 'Identifier': {
        const info = scope.lookup(node.name);
        if (!info || !info.tainted) return NO_TAINT;
        // Un valor saneado para el contexto actual deja de estar contaminado.
        if (info.sanitizedFor && info.sanitizedFor.includes(context)) {
          return { tainted: false, sanitized: true, path: info.path, confidence: 'low' };
        }
        return {
          tainted: true,
          path: info.path,
          confidence: info.confidence,
          sanitizedFor: info.sanitizedFor,
        };
      }

      case 'MemberExpression': {
        const source = matchSource(node);
        if (source) return { tainted: true, path: [source.label], confidence: source.confidence };
        const base = this.taintOf(node.object, scope, context);
        if (base) {
          return {
            tainted: true,
            path: [`${memberPath(node) || 'miembro'}`, ...base.path],
            confidence: base.confidence,
          };
        }
        return NO_TAINT;
      }

      case 'CallExpression':
      case 'NewExpression': {
        const source = matchSource(node);
        if (source) return { tainted: true, path: [source.label], confidence: source.confidence };
        if (matchSanitizer(node, context)) return NO_TAINT;
        const anySanitizer = matchAnySanitizer(node);
        if (anySanitizer) {
          // Saneado válido para otros contextos: sigue marcado, pero neutralizado
          // cuando el destino es un sumidero compatible (p. ej. HTML).
          return {
            tainted: true,
            path: [`saneado (${anySanitizer.label})`],
            confidence: 'low',
            sanitizedFor: anySanitizer.contexts,
          };
        }

        for (const arg of node.arguments || []) {
          const taint = this.taintOf(arg, scope, context);
          if (taint) {
            return {
              tainted: true,
              path: [`argumento de ${calleeName(node) || 'llamada'}()`, ...taint.path],
              confidence: taint.confidence,
            };
          }
        }
        const calleeTaint = this.taintOf(node.callee, scope, context);
        if (calleeTaint) return calleeTaint;
        return NO_TAINT;
      }

      case 'TemplateLiteral': {
        for (const expr of node.expressions || []) {
          const taint = this.taintOf(expr, scope, context);
          if (taint) return { tainted: true, path: ['plantilla literal', ...taint.path], confidence: taint.confidence };
        }
        return NO_TAINT;
      }

      case 'BinaryExpression':
      case 'LogicalExpression': {
        for (const side of [node.left, node.right]) {
          const taint = this.taintOf(side, scope, context);
          if (taint) return { tainted: true, path: ['concatenación', ...taint.path], confidence: taint.confidence };
        }
        return NO_TAINT;
      }

      case 'ConditionalExpression': {
        for (const branch of [node.test, node.consequent, node.alternate]) {
          const taint = this.taintOf(branch, scope, context);
          if (taint) return { tainted: true, path: ['operación ternaria', ...taint.path], confidence: taint.confidence };
        }
        return NO_TAINT;
      }

      case 'ArrayExpression': {
        for (const element of node.elements || []) {
          const taint = this.taintOf(element, scope, context);
          if (taint) return { tainted: true, path: ['elemento de array', ...taint.path], confidence: taint.confidence };
        }
        return NO_TAINT;
      }

      case 'ObjectExpression': {
        for (const prop of node.properties || []) {
          const value = prop.type === 'Property' ? prop.value : prop.argument;
          const taint = this.taintOf(value, scope, context);
          if (taint) return { tainted: true, path: ['propiedad de objeto', ...taint.path], confidence: taint.confidence };
        }
        return NO_TAINT;
      }

      case 'AssignmentExpression':
        return this.taintOf(node.right, scope, context);

      case 'AwaitExpression':
      case 'UnaryExpression':
      case 'SpreadElement':
      case 'ChainExpression':
        return this.taintOf(node.argument || node.expression, scope, context);

      case 'SequenceExpression': {
        for (const expr of node.expressions || []) {
          const taint = this.taintOf(expr, scope, context);
          if (taint) return taint;
        }
        return NO_TAINT;
      }

      case 'TaggedTemplateExpression': {
        // Las plantillas etiquetadas de Prisma parametrizan los valores:
        // no constituyen una vía de inyección SQL.
        const tag = calleeName(node.tag) || '';
        if (/^(Prisma\.sql|sql|prisma\.\$queryRaw|prisma\.\$executeRaw)$/.test(tag)) {
          return NO_TAINT;
        }
        return this.taintOf(node.quasi, scope, context);
      }

      case 'JSXExpressionContainer':
        return this.taintOf(node.expression, scope, context);

      default:
        return NO_TAINT;
    }
  }

  /** Evalúa un valor: devuelve contaminación y si el valor es dinámico. */
  evaluate(expr, scope, context) {
    const taint = this.taintOf(expr, scope, context);
    const literal = literalValue(expr);
    const dynamic = literal === undefined;
    return { taint, dynamic };
  }

  // -- sinks ---------------------------------------------------------------

  reportSink(sink, node, expr, scope, extra = {}) {
    const { taint, dynamic } = this.evaluate(expr, scope, sink.context);
    // El valor está saneado para este tipo de sumidero: no se reporta.
    if (taint && taint.sanitized) return;
    if (!taint && !dynamic) return;

    let severity = sink.severity;
    let confidence = taint ? taint.confidence : 'low';

    if (!taint) {
      // Valor dinámico pero sin ruta de contaminación identificada:
      // el sink sigue siendo un punto de inyección potencial.
      severity = downgrade(severity, 2);
      confidence = 'low';
    } else if (confidence === 'medium') {
      severity = downgrade(severity, 1);
    } else if (confidence === 'low') {
      severity = downgrade(severity, 1);
    }

    const path = taint ? taint.path : ['valor dinámico (sin origen de contaminación identificado)'];

    this.addFinding({
      ruleId: sink.id,
      severity,
      severityLabel: SEVERITY[severity].label,
      cwe: sink.cwe,
      title: sink.title,
      message: extra.message || sink.title,
      fix: sink.fix,
      file: this.currentFile,
      line: node.loc ? node.loc.start.line : 0,
      column: node.loc ? node.loc.start.column + 1 : 0,
      snippet: this.snippetFor(node),
      taintPath: path,
      tainted: Boolean(taint),
      confidence,
      ...extra,
    });
  }

  /** ¿El valor es una URL creada localmente (blob:) o de esquema seguro? */
  isSafeUrlValue(expr, scope) {
    if (!expr) return false;
    if (expr.type === 'Identifier') {
      const info = scope.lookup(expr.name);
      return Boolean(info && info.safeUrl);
    }
    return hasSafeUrlScheme(expr);
  }

  /** Igual que reportSink pero sólo informa si el valor está realmente contaminado. */
  reportTaintedOnly(sink, node, expr, scope, extra = {}) {
    const taint = this.taintOf(expr, scope, sink.context);
    if (!taint) return;
    let severity = sink.severity;
    if (taint.confidence === 'medium' || taint.confidence === 'low') {
      severity = downgrade(severity, 1);
    }
    this.addFinding({
      ruleId: sink.id,
      severity,
      severityLabel: SEVERITY[severity].label,
      cwe: sink.cwe,
      title: sink.title,
      message: extra.message || sink.title,
      fix: sink.fix,
      file: this.currentFile,
      line: node.loc ? node.loc.start.line : 0,
      column: node.loc ? node.loc.start.column + 1 : 0,
      snippet: this.snippetFor(node),
      taintPath: taint.path,
      tainted: true,
      confidence: taint.confidence,
      ...extra,
    });
  }

  snippetFor(node) {
    if (!this.currentSource || !node || !node.loc) return '';
    const lines = this.currentSource.split('\n');
    const start = Math.max(0, node.loc.start.line - 1);
    const end = Math.min(lines.length, node.loc.start.line + 1);
    return lines.slice(start, end).join('\n').trim();
  }

  /** Nombre legible de una función (declaración, expresión o flecha). */
  functionNameOf(node, parent) {
    if (node.id && node.id.name) return node.id.name;
    if (!parent) return null;
    if (parent.type === 'VariableDeclarator' && parent.id && parent.id.type === 'Identifier') {
      return parent.id.name;
    }
    if (parent.type === 'Property' && parent.key) return parent.key.name || null;
    if (parent.type === 'AssignmentExpression' && parent.left && parent.left.type === 'Identifier') {
      return parent.left.name;
    }
    return null;
  }

  checkCallSink(node, scope) {
    const name = calleeName(node) || '';
    const args = node.arguments || [];

    // eval()
    if (name === 'eval') {
      this.reportSink(SINKS.eval, node, args[0], scope);
      return;
    }

    // setTimeout/setInterval con cadena (implícitamente eval)
    if (/^(window\.)?(setTimeout|setInterval)$/.test(name) && args[0]) {
      const first = args[0];
      // 1º) Si el valor está contaminado, se reporta siempre.
      const timerTaint = this.taintOf(first, scope, 'code');
      if (!timerTaint) {
        // 2º) Si es (o puede ser) una función, no hay problema.
        const isFunctionArg =
          first.type === 'FunctionExpression' ||
          first.type === 'ArrowFunctionExpression' ||
          (first.type === 'Identifier' &&
            (this.functionNames.has(first.name) ||
              this.parameterNames.has(first.name) ||
              /^(fn|handler|callback|tick)$/i.test(first.name)));
        if (isFunctionArg) return; // patrón seguro
      }
      if (first.type === 'Literal' && typeof first.value === 'string') {
        this.addFinding({
          ruleId: SINKS.timerString.id,
          severity: 'low',
          severityLabel: SEVERITY.low.label,
          cwe: SINKS.timerString.cwe,
          title: SINKS.timerString.title,
          message: 'setTimeout/setInterval con una cadena literal (se evalúa como código)',
          fix: SINKS.timerString.fix,
          file: this.currentFile,
          line: node.loc ? node.loc.start.line : 0,
          column: node.loc ? node.loc.start.column + 1 : 0,
          snippet: this.snippetFor(node),
          taintPath: [],
          confidence: 'high',
        });
        return;
      }
      this.reportSink(SINKS.timerString, node, first, scope);
      return;
    }

    // Inyección de HTML en el DOM
    if (/(^|\.)insertAdjacentHTML$/.test(name) && args[1]) {
      this.reportSink(SINKS.insertAdjacentHTML, node, args[1], scope);
      return;
    }
    if (/(^|\.)(write|writeln)$/.test(name) && memberPath(node.callee && node.callee.object) === 'document') {
      this.reportSink(SINKS.documentWrite, node, args[0], scope);
      return;
    }

    // setAttribute con atributo peligroso
    if (/(^|\.)setAttribute$/.test(name) && args.length >= 2) {
      const attr = literalValue(args[0]);
      if (typeof attr === 'string' && /^(on[a-z]+|href|src|srcdoc|action|style|formaction)$/i.test(attr)) {
        this.reportTaintedOnly(SINKS.setAttribute, node, args[1], scope, {
          message: `setAttribute('${attr}', ...) con valor no confiable`,
        });
      }
      return;
    }

    // Redirección / window.open
    if (/(^|\.)open$/.test(name) && memberPath(node.callee && node.callee.object) === 'window') {
      const taint = this.taintOf(args[0], scope, 'url');
      if (taint || !hasSafeUrlScheme(args[0])) {
        this.reportSink(SINKS.windowOpen, node, args[0], scope);
      }
      return;
    }

    // postMessage con origen comodín
    if (/(^|\.)postMessage$/.test(name) && args.length >= 2) {
      const target = literalValue(args[1]);
      if (target === '*') {
        this.addFinding({
          ruleId: SINKS.postMessageStar.id,
          severity: SINKS.postMessageStar.severity,
          severityLabel: SEVERITY[SINKS.postMessageStar.severity].label,
          cwe: SINKS.postMessageStar.cwe,
          title: SINKS.postMessageStar.title,
          message: "postMessage(..., '*') envía datos a cualquier origen",
          fix: SINKS.postMessageStar.fix,
          file: this.currentFile,
          line: node.loc ? node.loc.start.line : 0,
          column: node.loc ? node.loc.start.column + 1 : 0,
          snippet: this.snippetFor(node),
          taintPath: [],
          confidence: 'high',
        });
      }
      return;
    }

    // Comandos del sistema
    if (/(^|\.)(exec|execSync)$/.test(name) && args[0]) {
      const taint = this.taintOf(args[0], scope, 'cmd');
      if (taint) {
        this.reportSink(SINKS.cmdExec, node, args[0], scope);
      } else if (args[0].type === 'TemplateLiteral' && args[0].expressions.length > 0) {
        this.addFinding({
          ruleId: 'cmd.exec-interpolation',
          severity: 'low',
          severityLabel: SEVERITY.low.label,
          cwe: 'CWE-78',
          title: 'execSync con comando construido por interpolación de cadena',
          message: 'El comando se compone con plantillas: hoy los operandos son constantes, pero el patrón es inyectable en cuantouno cambie.',
          fix: 'Usa execFileSync(cmd, [args]) sin shell: no hay parsing de shell que interpretar.',
          file: this.currentFile,
          line: node.loc ? node.loc.start.line : 0,
          column: node.loc ? node.loc.start.column + 1 : 0,
          snippet: this.snippetFor(node),
          taintPath: [],
          confidence: 'medium',
        });
      }
      return;
    }

    // SQL crudo
    if (/\$queryRawUnsafe|\$executeRawUnsafe|\$queryRawUnsafeMany/.test(name) && args[0]) {
      this.reportSink(SINKS.sqlRaw, node, args[0], scope);
      return;
    }

    // NoSQL
    if (node.callee && node.callee.type === 'MemberExpression') {
      const method = memberPropertyName(node.callee);
      if (method && NOSQL_METHODS.has(method) && isCollectionReceiver(node.callee.object) && args[0]) {
        this.reportSink(SINKS.nosqlQuery, node, args[0], scope, {
          message: `Filtro NoSQL pasado a ${method}() sin validar`,
        });
        this.checkNoSqlOperators(args[0], node, scope);
        return;
      }
    }

    // Respuesta del servidor con dato no confiable
    if (/(^|\.)(send|write|end)$/.test(name) && /^res(\.|$)/.test(memberPath(node.callee) || '') && args[0]) {
      this.reportTaintedOnly(SINKS.responseHtml, node, args[0], scope, {
        message: 'Se envía a la respuesta un valor no confiable (posible XSS reflejado si el Content-Type no es JSON)',
      });
    }
  }

  checkNoSqlOperators(expr, node, scope) {
    if (!expr || expr.type !== 'ObjectExpression') return;
    for (const prop of expr.properties || []) {
      if (prop.type !== 'Property') continue;
      const key = prop.key && prop.key.name ? prop.key.name : literalValue(prop.key);
      // Los operadores pueden anidarse: { password: { $ne: null } }
      if (prop.value && prop.value.type === 'ObjectExpression') {
        this.checkNoSqlOperators(prop.value, node, scope);
      }
      if (typeof key === 'string' && NOSQL_OPERATORS.includes(key)) {
        const taint = this.taintOf(prop.value, scope, 'nosql');
        // La presencia de un operador NoSQL ya cambia la semántica de la
        // consulta (p. ej. { password: { $ne: null } } anula la contraseña),
        // así que se informa aunque el valor sea una constante.
        const severity = taint
          ? downgrade(SINKS.nosqlOperator.severity, 1)
          : downgrade(SINKS.nosqlOperator.severity, 2);
        this.addFinding({
          ruleId: SINKS.nosqlOperator.id,
          severity,
          severityLabel: SEVERITY[severity].label,
          cwe: SINKS.nosqlOperator.cwe,
          title: SINKS.nosqlOperator.title,
          message: `Operador NoSQL ${key} en el filtro: cambia la semántica de la consulta`,
          fix: SINKS.nosqlOperator.fix,
          file: this.currentFile,
          line: prop.loc ? prop.loc.start.line : node.loc.start.line,
          column: prop.loc ? prop.loc.start.column + 1 : 0,
          snippet: this.snippetFor(prop),
          taintPath: taint ? taint.path : ['valor dinámico'],
          confidence: taint ? taint.confidence : 'low',
        });
      }
    }
  }

  checkNewSink(node, scope) {
    const name = calleeName(node);
    if (name === 'Function') {
      const arg = (node.arguments || [])[0];
      this.reportSink(SINKS.functionCtor, node, arg, scope);
    }
  }

  checkAssignSink(node, scope) {
    const left = node.left;
    if (!left || left.type !== 'MemberExpression') return;
    const prop = memberPropertyName(left);
    const path = memberPath(left) || '';

    if (prop === 'innerHTML' || prop === 'outerHTML' || prop === 'srcdoc') {
      this.reportSink(SINKS.innerHTML, node, node.right, scope, {
        message: `Asignación a ${prop} con valor no confiable`,
      });
      return;
    }

    if (/(^|\.)location(\.href)?$/.test(path) && /location/.test(path)) {
      const taint = this.taintOf(node.right, scope, 'url');
      if (taint || !hasSafeUrlScheme(node.right)) {
        this.reportSink(SINKS.openRedirect, node, node.right, scope, {
          message: 'Redirección del navegador a una URL no confiable',
        });
      }
      return;
    }

    if (prop === 'src' || prop === 'href') {
      const taint = this.taintOf(node.right, scope, 'url');
      const safeValue = hasSafeUrlScheme(node.right) || this.isSafeUrlValue(node.right, scope);
      if (taint || !safeValue) {
        this.reportSink(SINKS.jsxUrl, node, node.right, scope, {
          message: `Asignación a ${prop} con valor no confiable (posible esquema javascript:)`,
        });
      }
      return;
    }

    if (prop === '__proto__' || path.endsWith('.__proto__')) {
      this.addFinding({
        ruleId: SINKS.prototypePollution.id,
        severity: SINKS.prototypePollution.severity,
        severityLabel: SEVERITY[SINKS.prototypePollution.severity].label,
        cwe: SINKS.prototypePollution.cwe,
        title: SINKS.prototypePollution.title,
        message: 'Escritura explícita en __proto__',
        fix: SINKS.prototypePollution.fix,
        file: this.currentFile,
        line: node.loc ? node.loc.start.line : 0,
        column: node.loc ? node.loc.start.column + 1 : 0,
        snippet: this.snippetFor(node),
        taintPath: [],
        confidence: 'high',
      });
      return;
    }

    // obj[claveDinámica] = valor  -> posible contaminación de prototipo
    if (left.computed && left.property.type !== 'Literal') {
      const keyTaint = this.taintOf(left.property, scope, 'object');
      const valueTaint = this.taintOf(node.right, scope, 'object');
      if (keyTaint || valueTaint) {
        this.addFinding({
          ruleId: SINKS.prototypePollution.id,
          severity: downgrade(SINKS.prototypePollution.severity, 1),
          severityLabel: SEVERITY[downgrade(SINKS.prototypePollution.severity, 1)].label,
          cwe: SINKS.prototypePollution.cwe,
          title: SINKS.prototypePollution.title,
          message: 'Asignación con clave dinámica (posible contaminación de prototipo)',
          fix: SINKS.prototypePollution.fix,
          file: this.currentFile,
          line: node.loc ? node.loc.start.line : 0,
          column: node.loc ? node.loc.start.column + 1 : 0,
          snippet: this.snippetFor(node),
          taintPath: (keyTaint || valueTaint).path,
          confidence: 'medium',
        });
      }
    }
  }

  checkJsxSink(node, scope, parent) {
    if (node.type !== 'JSXAttribute') return;
    const attrName = node.name && node.name.name;
    if (!attrName) return;

    if (attrName === 'dangerouslySetInnerHTML') {
      const value = node.value;
      if (!value || value.type !== 'JSXExpressionContainer') return;
      const expr = value.expression;
      if (!expr || expr.type !== 'ObjectExpression') return;
      for (const prop of expr.properties || []) {
        if (prop.type !== 'Property') continue;
        const key = prop.key && prop.key.name;
        if (key !== '__html') continue;
        this.reportSink(SINKS.dangerouslySetInnerHTML, node, prop.value, scope, {
          message: 'dangerouslySetInnerHTML con contenido no confiable',
        });
      }
      return;
    }

    if (JSX_URL_ATTRIBUTES.has(attrName)) {
      const value = node.value;
      if (!value) return;
      let expr;
      if (value.type === 'JSXExpressionContainer') expr = value.expression;
      else if (value.type === 'Literal') return; // literal estático
      else return;
      if (!expr) return;

      // Elementos de alto riesgo: el valor se reporta siempre (aunque no se
      // haya podido trazar el origen del dato).
      const tagName = parent && parent.openingElement && parent.openingElement.name
        ? parent.openingElement.name.name
        : null;
      // En React, los props de un componente propio (mayúscula inicial) no son
      // atributos del DOM: no pueden provocar XSS por sí solos.
      const isHostTag = Boolean(tagName) && /^[a-z]/.test(tagName);
      if (!isHostTag) return;

      const HIGH_RISK_TAGS = new Set(['iframe', 'object', 'embed', 'form', 'script', 'base']);
      const HIGH_RISK_ATTRS = new Set(['action', 'formAction', 'poster', 'srcDoc', 'background']);
      const highRisk =
        (tagName && HIGH_RISK_TAGS.has(tagName)) ||
        HIGH_RISK_ATTRS.has(attrName) ||
        (attrName === 'data' && tagName === 'object');

      if (highRisk) {
        this.reportSink(SINKS.jsxUrl, node, expr, scope, {
          message: `Atributo ${attrName}${tagName ? ` de <${tagName}>` : ''} con valor no confiable`,
        });
        return;
      }

      // Resto de elementos (a, img, link...): sólo si el dato está contaminado.
      this.reportTaintedOnly(SINKS.jsxUrl, node, expr, scope, {
        message: `Atributo ${attrName} con valor no confiable`,
      });
    }
  }

  // -- AST extras ----------------------------------------------------------

  checkRegexLiterals(node) {
    if (node.type !== 'Literal' || !node.regex) return;
    const pattern = node.regex.pattern;
    if (/\([^)]*[+*][^)]*\)\s*[+*]/.test(pattern) || /\([^)]*\{\d+,\}[^)]*\)\s*[+*]/.test(pattern)) {
      this.addFinding({
        ruleId: 'regex.redos',
        severity: 'medium',
        severityLabel: SEVERITY.medium.label,
        cwe: 'CWE-1333',
        title: 'Expresión regular vulnerable a ReDoS',
        message: `Patrón con cuantificadores anidados: /${pattern}/`,
        fix: 'Reescribe el patrón sin cuantificadores anidados o limita la longitud de la entrada.',
        file: this.currentFile,
        line: node.loc ? node.loc.start.line : 0,
        column: node.loc ? node.loc.start.column + 1 : 0,
        snippet: this.snippetFor(node),
        taintPath: [],
        confidence: 'high',
      });
    }
  }

  checkHardcodedSecrets(node) {
    const secretKey = /^(password|passwd|pwd|secret|api_?key|api_?secret|client_?secret|access_?key|access_?token|auth_?token|private_?key|jwt_?secret|encryption_?key|db_?password)$/i;

    const consider = (keyName, valueNode) => {
      if (!keyName || !valueNode) return;
      if (!secretKey.test(String(keyName))) return;
      if (valueNode.type !== 'Literal' || typeof valueNode.value !== 'string') return;
      const value = valueNode.value;
      if (value.length < 8) return;
      if (PLACEHOLDER_SECRETS.test(value)) return;
      if (/^process\.env/i.test(value)) return;
      this.addFinding({
        ruleId: 'secret.hardcoded',
        severity: 'high',
        severityLabel: SEVERITY.high.label,
        cwe: 'CWE-798',
        title: 'Secreto o credencial en el código',
        message: `Credencial '${keyName}' con valor literal en el código`,
        fix: 'Mueve el valor a una variable de entorno y rota la credencial expuesta.',
        file: this.currentFile,
        line: valueNode.loc ? valueNode.loc.start.line : 0,
        column: valueNode.loc ? valueNode.loc.start.column + 1 : 0,
        snippet: this.snippetFor(valueNode),
        taintPath: [],
        confidence: 'high',
      });
    };

    if (node.type === 'Property' && node.key) {
      const keyName = node.key.type === 'Identifier' ? node.key.name : literalValue(node.key);
      consider(keyName, node.value);
      return;
    }

    if (node.type === 'VariableDeclarator' && node.id && node.id.type === 'Identifier') {
      consider(node.id.name, node.init);
    }
  }

  // -- patrón sobre texto --------------------------------------------------

  checkTextPatterns(text) {
    for (const rule of PATTERN_RULES) {
      const re = new RegExp(rule.re.source, rule.re.flags);
      const match = re.exec(text);
      if (!match) continue;
      if (rule.requires && !rule.requires.test(text)) continue;
      if (rule.skipIf && rule.skipIf.test(text)) continue;

      let severity = rule.severity;
      if (rule.downgradeIf && rule.downgradeIf.test(text)) {
        severity = downgrade(severity, 2);
      }

      const { line, column } = offsetToPosition(text, match.index);
      const lines = text.split('\n');

      this.addFinding({
        ruleId: rule.id,
        severity,
        severityLabel: SEVERITY[severity].label,
        cwe: rule.cwe,
        title: rule.title,
        message: rule.detail,
        fix: rule.fix,
        file: this.currentFile,
        line,
        column,
        snippet: (lines[line - 1] || '').trim(),
        taintPath: [],
        confidence: 'high',
      });
    }
  }

  /** Cookie de sesión escrita desde JS sin los flags de protección. */
  checkCookieFlags(node) {
    if (!isDocumentCookieSet(node)) return;
    const value = literalValue(node.right);
    if (value === undefined) return;
    const missing = [];
    if (!/;\s*Secure/i.test(value)) missing.push('Secure');
    if (!/;\s*HttpOnly/i.test(value)) missing.push('HttpOnly');
    if (!/;\s*SameSite/i.test(value)) missing.push('SameSite');
    if (missing.length === 0) return;

    this.addFinding({
      ruleId: 'cookie.insecure',
      severity: 'medium',
      severityLabel: SEVERITY.medium.label,
      cwe: 'CWE-614',
      title: 'Cookie escrita desde JavaScript sin flags de protección',
      message: `Faltan los flags: ${missing.join(', ')}`,
      fix: 'Añade Secure, HttpOnly y SameSite; idealmente emite la cookie desde el servidor.',
      file: this.currentFile,
      line: node.loc ? node.loc.start.line : 0,
      column: node.loc ? node.loc.start.column + 1 : 0,
      snippet: this.snippetFor(node),
      taintPath: [],
      confidence: 'high',
    });
  }

  /** target="_blank" sin rel="noopener" en el mismo elemento. */
  checkTargetBlank(node, parent) {
    if (node.type !== 'JSXAttribute') return;
    if (!node.name || node.name.name !== 'target') return;
    if (literalValue(node.value) !== '_blank') return;
    if (!parent || parent.type !== 'JSXElement') return;

    const rel = (parent.attributes || []).find(
      (attr) => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'rel'
    );
    if (rel) {
      const relValue = literalValue(rel.value);
      if (typeof relValue === 'string' && /noopener/i.test(relValue)) return;
    }

    this.addFinding({
      ruleId: 'link.target-blank',
      severity: 'low',
      severityLabel: SEVERITY.low.label,
      cwe: 'CWE-1022',
      title: 'target="_blank" sin rel="noopener"',
      message: 'La ventana abierta puede controlar la ventana de origen (tabnabbing).',
      fix: 'Añade rel="noopener noreferrer" al enlace.',
      file: this.currentFile,
      line: node.loc ? node.loc.start.line : 0,
      column: node.loc ? node.loc.start.column + 1 : 0,
      snippet: this.snippetFor(node),
      taintPath: [],
      confidence: 'high',
    });
  }

  /**
   * Math.random() no es criptográficamente seguro. Sólo se reporta cuando el
   * valor se usa en un contexto de credencial (contraseña, token, PIN, código).
   */
  checkWeakRandom(node, scope) {
    const name = calleeName(node) || '';
    if (!/^Math\.random$/.test(name)) return;

    const context = [this.currentVarName, this.currentFunctionName].filter(Boolean).join(' ');
    const strong = /(pass|clave|password|secret|token|otp|pin|verif|reset|invit)/i.test(context);
    const weak = /(generate|unique|temp)/i.test(context) && /(code|pass|pin|otp|secret)/i.test(context);
    if (!strong && !weak) return;

    this.addFinding({
      ruleId: 'crypto.weak-random',
      severity: 'medium',
      severityLabel: SEVERITY.medium.label,
      cwe: 'CWE-338',
      title: 'Math.random() para generar un valor sensible',
      message: `Math.random() se usa para generar "${context.trim()}" (predecible: no es criptográficamente seguro).`,
      fix: 'Usa crypto.randomBytes()/crypto.randomUUID() del módulo crypto.',
      file: this.currentFile,
      line: node.loc ? node.loc.start.line : 0,
      column: node.loc ? node.loc.start.column + 1 : 0,
      snippet: this.snippetFor(node),
      taintPath: [],
      confidence: 'high',
    });
  }

  checkStorageSensitive(node, scope) {
    if (node.type !== 'CallExpression') return;
    const name = calleeName(node) || '';
    if (!/^(window\.)?(local|session)Storage\.setItem$/.test(name)) return;
    const key = literalValue((node.arguments || [])[0]);
    if (typeof key !== 'string' || !STORAGE_SENSITIVE.test(key)) return;
    this.addFinding({
      ruleId: SINKS.storageSecret.id,
      severity: SINKS.storageSecret.severity,
      severityLabel: SEVERITY[SINKS.storageSecret.severity].label,
      cwe: SINKS.storageSecret.cwe,
      title: SINKS.storageSecret.title,
      message: `Se guarda '${key}' en ${/session/.test(name) ? 'sessionStorage' : 'localStorage'}`,
      fix: SINKS.storageSecret.fix,
      file: this.currentFile,
      line: node.loc ? node.loc.start.line : 0,
      column: node.loc ? node.loc.start.column + 1 : 0,
      snippet: this.snippetFor(node),
      taintPath: [],
      confidence: 'high',
    });
  }

  // -- recorrido principal -------------------------------------------------

  analyzeFile(filePath) {
    const { ast, source, error } = parseFile(filePath, this.rootDir);
    this.stats.files += 1;

    if (error) {
      this.stats.unparsed += 1;
      this.unparsedFiles = this.unparsedFiles || [];
      this.unparsedFiles.push({ file: relativePath(filePath, this.rootDir), error: error.message });
      return;
    }

    this.stats.parsed += 1;
    this.stats.lines += source.split('\n').length;

    this.currentFile = relativePath(filePath, this.rootDir);
    this.currentSource = source;
    this.functionNames = collectFunctionNames(ast);
    this.parameterNames = this.functionNames;

    const rootScope = new Scope(null, 'module');
    let scope = rootScope;

    const pushScope = (kind) => {
      scope = new Scope(scope, kind);
    };
    const popScope = () => {
      scope = scope.parent;
    };

    const declarePattern = (pattern, info) => {
      if (!pattern) return;
      if (pattern.type === 'Identifier') {
        scope.declare(pattern.name, info);
        return;
      }
      if (pattern.type === 'ObjectPattern') {
        for (const prop of pattern.properties || []) {
          if (prop.type === 'RestElement') {
            declarePattern(prop.argument, info);
            continue;
          }
          declarePattern(prop.value || prop.argument, info);
        }
        return;
      }
      if (pattern.type === 'ArrayPattern') {
        for (const element of pattern.elements || []) {
          if (!element) continue;
          declarePattern(element.type === 'RestElement' ? element.argument : element, info);
        }
        return;
      }
      if (pattern.type === 'AssignmentPattern') {
        declarePattern(pattern.left, info);
      }
    };

    walk(ast, {
      enter: (node, parent) => {
        switch (node.type) {
          case 'FunctionDeclaration':
          case 'FunctionExpression':
          case 'ArrowFunctionExpression': {
            pushScope('function');
            this.functionStack = this.functionStack || [];
            this.functionStack.push(this.functionNameOf(node, parent));
            for (const param of node.params || []) {
              const paramTaint = this.taintOf(param, scope, 'generic');
              declarePattern(
                param,
                paramTaint
                  ? { tainted: true, path: paramTaint.path, confidence: paramTaint.confidence }
                  : { tainted: false, path: [], confidence: 'high' }
              );
            }
            break;
          }

          case 'BlockStatement':
            pushScope('block');
            break;

              case 'VariableDeclarator': {
            this.currentVarName = node.id && node.id.type === 'Identifier' ? node.id.name : this.currentVarName;
            const taint = this.taintOf(node.init, scope, 'generic');
            if (taint) {
              declarePattern(node.id, {
                tainted: true,
                path: taint.path,
                confidence: taint.confidence,
                sanitizedFor: taint.sanitizedFor,
              });
            } else if (isBlobUrlFactory(node.init)) {
              // URL creada en el propio cliente (blob:) no es un destino externo.
              declarePattern(node.id, { tainted: false, path: [], confidence: 'high', safeUrl: true });
            }
            this.checkHardcodedSecrets(node);
            break;
          }

          case 'ForOfStatement':
          case 'ForInStatement': {
            const iterableTaint = this.taintOf(node.right, scope, 'generic');
            if (node.left && node.left.type === 'VariableDeclaration') {
              for (const decl of node.left.declarations) {
                // Siempre se declara la variable del bucle: si el iterable no està
                // contaminant, la variable queda neta i sombrea la homònima externa.
                declarePattern(
                  decl.id,
                  iterableTaint
                    ? { tainted: true, path: iterableTaint.path, confidence: iterableTaint.confidence }
                    : { tainted: false, path: [], confidence: 'high' }
                );
              }
            }
            break;
          }

          case 'AssignmentExpression': {
            if (node.operator === '=') {
              const taint = this.taintOf(node.right, scope, 'generic');
              if (taint && node.left.type === 'Identifier') {
                scope.declare(node.left.name, {
                  tainted: true,
                  path: taint.path,
                  confidence: taint.confidence,
                  sanitizedFor: taint.sanitizedFor,
                });
              } else if (taint && node.left.type === 'MemberExpression') {
                const base = memberPath(node.left.object);
                if (base) scope.declare(base, { tainted: true, path: taint.path, confidence: taint.confidence });
              }
            }
            this.checkAssignSink(node, scope);
            this.checkCookieFlags(node);
            break;
          }

          case 'CallExpression':
            this.checkCallSink(node, scope);
            this.checkStorageSensitive(node, scope);
            this.checkWeakRandom(node, scope);
            break;

          case 'NewExpression':
            this.checkNewSink(node, scope);
            break;

          case 'JSXAttribute':
            this.checkJsxSink(node, scope, parent);
            this.checkTargetBlank(node, parent);
            break;

          case 'Literal':
            this.checkRegexLiterals(node);
            break;

          case 'Property':
            this.checkHardcodedSecrets(node);
            break;

          default:
            break;
        }
      },
      exit: (node) => {
        if (
          node.type === 'FunctionDeclaration' ||
          node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression'
        ) {
          if (this.functionStack && this.functionStack.length) this.functionStack.pop();
        }
        if (node.type === 'VariableDeclarator') {
          this.currentVarName = null;
        }
        if (
          node.type === 'FunctionDeclaration' ||
          node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression' ||
          node.type === 'BlockStatement'
        ) {
          popScope();
        }
      },
    });

    // Reglas basadas en texto sobre el fichero completo
    this.checkTextPatterns(source);
  }
}

function downgrade(severity, steps) {
  const order = ['info', 'low', 'medium', 'high', 'critical'];
  const index = order.indexOf(severity);
  return order[Math.max(0, index - steps)];
}

function findFirstIndex(text, rule) {
  const match = text.match(rule.re);
  return match ? match.index : -1;
}

function offsetToPosition(text, offset) {
  const before = text.slice(0, offset);
  const lines = before.split('\n');
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

module.exports = { Engine, Scope, downgrade };
