import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Configuración de Vitest para el cliente (frontend).
// Usa jsdom + React Testing Library. Los tests viven en /tests/client.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@client': path.join(repoRoot, 'client'),
      '@client-src': path.join(repoRoot, 'client/src'),
      react: path.join(repoRoot, 'client/node_modules/react'),
      'react-dom': path.join(repoRoot, 'client/node_modules/react-dom'),
      // Los archivos de prueba viven en la raíz del monorepo, mientras que
      // estas dependencias pertenecen al paquete `client`. Sin este alias
      // Vite intenta resolverlas desde /tests y no encuentra los enlaces de
      // pnpm del frontend.
      '@testing-library/jest-dom': path.join(repoRoot, 'client/node_modules/@testing-library/jest-dom'),
      '@testing-library/react': path.join(repoRoot, 'client/node_modules/@testing-library/react'),
      '@testing-library/user-event': path.join(repoRoot, 'client/node_modules/@testing-library/user-event'),
    },
  },
  test: {
    name: 'client',
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.join(repoRoot, 'tests/client/setup.js')],
    css: false,
    include: ['./tests/client/**/*.test.{js,jsx}', '../tests/client/**/*.test.{js,jsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['client/src/**/*.{js,jsx}'],
      exclude: [
        'client/src/**/__tests__/**',
        'client/src/main.jsx',
        'client/src/**/*.test.*',
        'client/src/pages/**',
        'client/src/context/**',
        'client/src/layouts/**',
        'client/src/assets/**',
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
