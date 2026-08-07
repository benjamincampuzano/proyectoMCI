import { defineConfig } from 'vitest/config';

// Configuración raíz que delega a los projects de cliente y servidor.
// `pnpm test` desde la raíz corre ambas suites.
export default defineConfig({
  test: {
    projects: ['./client/vitest.config.js', './server/vitest.config.js'],
    coverage: { enabled: false },
  },
});
