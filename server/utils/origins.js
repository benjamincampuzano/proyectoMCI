'use strict';

/**
 * Orígenes permitidos por la API.
 *
 * Fuente única de verdad para:
 *  - la política CORS de Express (server/index.js)
 *  - la verificación de Origin del middleware CSRF (server/middleware/csrf.js)
 *
 * Así ambos controles comparten exactamente la misma lista y no pueden
 * desincronizarse.
 */

/** Orígenes permitidos en desarrollo (servidor local). */
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

/** Orígenes permitidos en producción, configurables por entorno. */
const PROD_ORIGINS = ['https://proyecto-mci.vercel.app', 'https://somos.mcimanizales.com'];

function normalizeOrigin(origin) {
    if (!origin || typeof origin !== 'string') return null;
    return origin.trim().replace(/\/+$/, '');
}

/**
 * Lista de orígenes permitidos. En desarrollo se permite cualquier origen
 * (mismo criterio que aplica historically el callback de CORS) para no
 * bloquear el desarrollo con puertosVariables.
 */
function getAllowedOrigins() {
    const configured = [
        ...DEV_ORIGINS,
        ...PROD_ORIGINS,
        process.env.FRONTEND_URL,
        process.env.EXTRA_ALLOWED_ORIGINS
    ]
        .filter(Boolean)
        .map(normalizeOrigin)
        .filter(Boolean);

    // Sin duplicados
    return [...new Set(configured)];
}

/**
 * ¿El origen está permitido?
 * En producción la lista es restrictiva; fuera de producción se acepta
 * cualquier origen (entorno local), igual que la política CORS.
 */
function isAllowedOrigin(origin) {
    const clean = normalizeOrigin(origin);
    if (!clean) return false;
    if (process.env.NODE_ENV !== 'production') return true;
    return getAllowedOrigins().includes(clean);
}

module.exports = { DEV_ORIGINS, PROD_ORIGINS, getAllowedOrigins, isAllowedOrigin, normalizeOrigin };
