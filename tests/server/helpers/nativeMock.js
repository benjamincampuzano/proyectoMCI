import { createRequire } from 'node:module';

/**
 * Los módulos del servidor son CommonJS y se cargan con `require` nativo,
 * que NO pasa por el registro de mocks de Vitest (`vi.mock` no los intercepta,
 * ni siquiera en cadenas transitivas: A requiere B, B requiere C).
 *
 * Estas utilidades inyectan stubs directamente en `require.cache` de Node
 * ANTES de cargar el módulo bajo prueba con `nativeRequire`, de modo que
 * todos los `require` (directos y transitivos) reciban el stub.
 *
 * Aislamiento: Vitest ejecuta cada archivo de test en un entorno aislado,
 * por lo que lo inyectado aquí no afecta a otros archivos.
 */
export function nativeMock(callerUrl, specifier, exports) {
    const req = createRequire(callerUrl);
    const resolved = req.resolve(specifier);
    req.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
    return resolved;
}

export function nativeRequire(callerUrl, specifier) {
    return createRequire(callerUrl)(specifier);
}
