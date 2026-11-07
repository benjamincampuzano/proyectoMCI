'use strict';

/**
 * Resolución de las dependencias del analizador (acorn / acorn-jsx).
 *
 * El proyecto no declara `acorn` como dependencia directa, pero su store local
 * de pnpm (`node_modules/.pnpm`) ya lo contiene porque llega como dependencia
 * transitiva de rollup/vite. Este módulo lo localiza sin instalar nada y,
 * sobre todo, sin ejecutar una sola línea del código auditado.
 */

const fs = require('fs');
const path = require('path');

function tryResolve(name, fromDir) {
  try {
    return require.resolve(name, { paths: [fromDir] });
  } catch (_err) {
    return null;
  }
}

/** Busca el paquete dentro del store virtual de pnpm (node_modules/.pnpm). */
function findInPnpmStore(name, rootDir) {
  const storeDir = path.join(rootDir, 'node_modules', '.pnpm');
  if (!fs.existsSync(storeDir)) return null;

  const flat = name.replace('/', '+');
  const candidates = fs
    .readdirSync(storeDir)
    .filter((entry) => entry === flat || entry.startsWith(`${flat}@`));

  // Preferimos la versión más reciente (orden lexicográfico ascendente -> inverso).
  candidates.sort();
  for (const dir of candidates.reverse()) {
    const pkgPath = path.join(storeDir, dir, 'node_modules', name);
    if (fs.existsSync(pkgPath)) return pkgPath;
  }
  return null;
}

let cached = null;

/**
 * Carga el parser. Devuelve una clase `Parser` extendida con soporte JSX
 * cuando acorn-jsx está disponible (si no, el análisis de .jsx se omite).
 */
function loadParser(rootDir) {
  if (cached) return cached;

  const acornPath = tryResolve('acorn', __dirname) || findInPnpmStore('acorn', rootDir);
  if (!acornPath) {
    throw new Error(
      'No se encuentra "acorn". Instálalo (pnpm add -Dw acorn acorn-jsx) o ' +
        'asegúrate de que exista en node_modules/.pnpm.'
    );
  }

  const acorn = require(acornPath);

  const jsxPath = tryResolve('acorn-jsx', __dirname) || findInPnpmStore('acorn-jsx', rootDir);
  const jsx = jsxPath ? require(jsxPath) : null;

  // acorn 8+ usa Parser.extend(plugins) en lugar de la opción `plugins`.
  const Parser = jsx ? acorn.Parser.extend(jsx()) : acorn.Parser;

  cached = { acorn, jsx, Parser, jsxSupported: Boolean(jsx) };
  return cached;
}

module.exports = { loadParser };
