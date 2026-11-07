'use strict';

/**
 * Protección CSRF.
 *
 * El access token viaja en la cabecera `Authorization`, por lo que las rutas
 * protegidas ya no son susceptibles de CSRF (un atacante cross-site no puede
 * forjar esa cabecera). La única credencial que viaja en cookie es el refresh
 * token, y las rutas que dependen de él (/refresh-token, /logout) están
 * protegidas por:
 *
 *   1. Token CSRF "double submit" firmado con HMAC: el cliente lee la cookie
 *      `csrfToken` (legible por JS) y la reenvía en la cabecera `X-CSRF-Token`.
 *      El servidor valida la firma y la coincidencia con la cookie.
 *   2. `SameSite` (strict/lax/none) en la cookie de refresh.
 *   3. Verificación del header `Origin` en las peticiones que modifican estado.
 */

const {
    REFRESH_COOKIE_NAME,
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    getCookie,
    verifyCsrfToken,
    safeCompare,
} = require('../utils/authCookies');
const { isAllowedOrigin } = require('../utils/origins');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rutas exentas de token CSRF:
 *  - No hay sesión todavía (login, registro, setup).
 *  - El refresh/logout se validan además por Origin y SameSite.
 */
const CSRF_EXEMPT_PATHS = new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/setup',
    '/api/auth/init-status',
]);

/** Rutas que sólo dependen de la cookie: si no hay cookie CSRF, se acepta. */
const COOKIE_ONLY_PATHS = new Set(['/api/auth/refresh-token', '/api/auth/logout']);

function requestPath(req) {
    const original = req.originalUrl || req.url || '';
    return original.split('?')[0];
}

/**
 * Exige un token CSRF válido en las peticiones que modifican estado y que
 * arrastran la cookie de sesión.
 */
function csrfProtection(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();

    const path = requestPath(req);
    if (CSRF_EXEMPT_PATHS.has(path)) return next();

    // Sin cookie de refresh no hay autenticación por cookie → el CSRF no aplica.
    if (!getCookie(req, REFRESH_COOKIE_NAME)) return next();

    const csrfCookie = getCookie(req, CSRF_COOKIE_NAME);
    const header = req.get(CSRF_HEADER_NAME);

    if (!csrfCookie) {
        // La cookie CSRF se ha perdido (p. ej. caducó sola): el refresh y el
        // logout siguen protegidos por SameSite + verificación de Origin.
        if (COOKIE_ONLY_PATHS.has(path)) return next();
        return res.status(403).json({ message: 'Token CSRF ausente' });
    }

    if (!header || !verifyCsrfToken(header)) {
        return res.status(403).json({ message: 'Token CSRF inválido' });
    }

    if (!safeCompare(header, csrfCookie)) {
        return res.status(403).json({ message: 'Token CSRF no coincide con la cookie' });
    }

    return next();
}

/**
 * Verifica el header `Origin` de las peticiones que modifican estado.
 * Los clientes sin Origin (curl, pruebas E2E, apps móviles) no se validan:
 * no son vectores de CSRF desde el navegador.
 */
function verifyOrigin(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.get('origin');
    if (!origin) return next();

    if (!isAllowedOrigin(origin)) {
        return res.status(403).json({ message: 'Origen no permitido' });
    }

    return next();
}

module.exports = { csrfProtection, verifyOrigin, CSRF_EXEMPT_PATHS, COOKIE_ONLY_PATHS };
