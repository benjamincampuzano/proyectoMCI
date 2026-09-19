// Setup global para tests del cliente.
// - Extiende `expect` con los matchers de @testing-library/jest-dom
//   (toBeInTheDocument, toHaveTextContent, toBeVisible, etc.)
// - Limpia el DOM después de cada test automáticamente.

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import React from 'react';

// Los tests viven fuera del paquete `client`, por lo que algunos JSX se
// transforman con el runtime clásico. Exponer React conserva compatibilidad
// con esos archivos sin obligarlos a importar React uno a uno.
globalThis.React = React;

// jsdom crea el storage en `window`; Vitest no siempre lo publica como global
// para archivos ubicados fuera de su raíz de proyecto.
const storageData = new Map();
const testStorage = {
  getItem: (key) => storageData.get(String(key)) ?? null,
  setItem: (key, value) => storageData.set(String(key), String(value)),
  removeItem: (key) => storageData.delete(String(key)),
  clear: () => storageData.clear(),
};

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: testStorage,
});

afterEach(() => {
  cleanup();
});
