import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Configuración de Vitest para el servidor (backend).
// Usa node environment. Los tests viven en /tests/server.
// El servidor es CommonJS, pero Vitest carga los tests como ESM internamente.
export default defineConfig({
  resolve: {
    alias: {
      // Permite importar módulos del servidor con rutas absolutas estables
      '@server': path.join(repoRoot, 'server'),
      '@server-utils': path.join(repoRoot, 'server/utils'),
      '@server-middleware': path.join(repoRoot, 'server/middleware'),
      '@server-services': path.join(repoRoot, 'server/services'),
    },
  },
  test: {
    name: 'server',
    environment: 'node',
    globals: true,
    setupFiles: ['../tests/server/setup.js'],
    include: ['./tests/server/**/*.test.js', '../tests/server/**/*.test.js'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['server/{utils,middleware,services}/**/*.js'],
      exclude: [
        'server/**/__tests__/**',
        'server/index.js',
        'server/prisma/**',
        'server/scripts/**',
        'server/routes/**',
        'server/controllers/**',
      ],
      thresholds: {
        lines: 60,
        branches: 60,
        functions: 60,
        statements: 60,
      },
    },
  },
});
