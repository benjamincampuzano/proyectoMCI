// Setup global para tests del servidor.
// - Fuerza NODE_ENV=test
// - Silencia logs accidentales que ensucien la salida de CI
// - Mockea Prisma para que los tests unitarios no necesiten DATABASE_URL ni
//   abran conexiones a una base de datos real. Los tests que necesitan
//   respuestas específicas reemplazan este mock mediante nativeMock.

process.env.NODE_ENV = 'test';

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const require = createRequire(import.meta.url);
const databasePath = require.resolve(path.join(repoRoot, 'server/utils/database.js'));

const asyncNoop = async () => undefined;
const modelMock = new Proxy({}, {
  get: () => asyncNoop,
});

const prismaMock = new Proxy({
  $connect: asyncNoop,
  $disconnect: asyncNoop,
  $executeRaw: asyncNoop,
  $queryRaw: asyncNoop,
  $transaction: async (operation) => (
    typeof operation === 'function' ? operation(prismaMock) : operation
  ),
}, {
  get(target, property) {
    return property in target ? target[property] : modelMock;
  },
});

// Los módulos del backend son CommonJS; insertar el mock en require.cache
// permite que sus `require('../utils/database')` nativos lo reciban.
require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: prismaMock,
};
