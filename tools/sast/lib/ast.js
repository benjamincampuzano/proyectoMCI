'use strict';

/**
 * Capa AST: parseo de ficheros JavaScript/JSX y utilidades de recorrido.
 *
 * Todo el análisis es estático: el código del proyecto se lee como texto y se
 * convierte en un árbol AST. Nunca se evalúa ni se ejecuta.
 */

const fs = require('fs');
const path = require('path');
const { loadParser } = require('./deps');

const SKIP_KEYS = new Set(['type', 'start', 'end', 'loc', 'range']);

/**
 * Recorrido genérico en pre-orden sobre cualquier AST estilo ESTree/JSX.
 * `visitor.enter(node, parent, key)` y `visitor.exit(node, parent, key)`.
 */
function walk(node, visitor) {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const child of node) walk(child, visitor);
    return;
  }
  if (typeof node.type !== 'string') return;

  const parent = visitor.__parent || null;
  if (visitor.enter) visitor.enter(node, parent);

  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue;
    const child = node[key];
    if (child && typeof child === 'object') {
      const saved = visitor.__parent;
      visitor.__parent = node;
      walk(child, visitor);
      visitor.__parent = saved;
    }
  }

  if (visitor.exit) visitor.exit(node, parent);
}

/** Nombres de miembros: `a.b.c` -> "a.b.c". Devuelve null si no es un MemberExpression. */
function memberPath(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'ThisExpression') return 'this';
  if (node.type === 'MemberExpression') {
    const base = memberPath(node.object);
    if (!base) return null;
    const prop = memberPropertyName(node);
    if (prop === null) return null;
    return `${base}.${prop}`;
  }
  if (node.type === 'CallExpression') {
    const callee = calleeName(node);
    return callee ? `${callee}()` : null;
  }
  if (node.type === 'ChainExpression') return memberPath(node.expression);
  return null;
}

/** Nombre de la propiedad de un MemberExpression (null si es dinámico). */
function memberPropertyName(node) {
  if (!node || node.type !== 'MemberExpression') return null;
  if (!node.computed) {
    return node.property.type === 'Identifier' ? node.property.name : null;
  }
  if (node.property.type === 'Literal' && typeof node.property.value === 'string') {
    return node.property.value;
  }
  return null;
}

/** Nombre legible de una llamada: `axios.get`, `foo`, etc. */
function calleeName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') return memberPath(node);
  if (node.type === 'ChainExpression') return calleeName(node.expression);
  // Se acepta tanto el nodo de llamada como su "callee".
  if (node.type === 'CallExpression' || node.type === 'NewExpression') {
    return calleeName(node.callee);
  }
  return null;
}

/** Valor literal de un nodo si es constante (Literal, Template sin expresiones...). */
function literalValue(node) {
  if (!node) return undefined;
  if (node.type === 'Literal') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((q) => q.value.cooked).join('');
  }
  return undefined;
}

/** Texto fuente de un nodo (usa start/end sobre el buffer original). */
function sourceText(source, node) {
  if (!node || node.start === undefined || node.end === undefined) return '';
  return source.slice(node.start, node.end);
}

/** Localiza un atributo JSX por nombre. */
function jsxAttribute(element, name) {
  if (!element || element.type !== 'JSXElement') return null;
  for (const attr of element.attributes || []) {
    if (attr.type !== 'JSXAttribute') continue;
    if (attr.name && attr.name.type === 'JSXIdentifier' && attr.name.name === name) {
      return attr;
    }
  }
  return null;
}

/** Expresión de un atributo JSX (envuelve literales en un Literal sintético). */
function jsxAttributeExpression(attr) {
  if (!attr) return null;
  const value = attr.value;
  if (!value) return null;
  if (value.type === 'JSXExpressionContainer') return value.expression;
  if (value.type === 'Literal') {
    return { type: 'Literal', value: value.value, start: value.start, end: value.end, loc: value.loc };
  }
  return null;
}

/**
 * Parsea un fichero. Devuelve { ast } o { error }.
 * No ejecuta nada: sólo lee el fichero y lo convierte en AST.
 */
function parseFile(filePath, rootDir) {
  const { Parser } = loadParser(rootDir);
  const source = fs.readFileSync(filePath, 'utf8');
  const isJsx = filePath.endsWith('.jsx');
  const options = {
    ecmaVersion: 'latest',
    sourceType: 'module',
    locations: true,
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    allowHashBang: true,
    preserveParens: false,
  };

  try {
    return { ast: Parser.parse(source, options), source, error: null };
  } catch (errModule) {
    // CommonJS con `return` en el ámbito superior o `require` con sintaxis antigua.
    try {
      const ast = Parser.parse(source, { ...options, sourceType: 'script' });
      return { ast, source, error: null };
    } catch (errScript) {
      const err = isJsx && /Unexpected token/.test(errModule.message) ? errModule : errScript;
      return { ast: null, source, error: err };
    }
  }
}

/** Nombra un fichero de forma legible para los informes. */
function relativePath(filePath, rootDir) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

module.exports = {
  walk,
  memberPath,
  memberPropertyName,
  calleeName,
  literalValue,
  sourceText,
  jsxAttribute,
  jsxAttributeExpression,
  parseFile,
  relativePath,
};
