'use strict';

/**
 * Gestión de cookies de autenticación y token CSRF.
 *
 * Modelo de sesión:
 *  - Access token  → JWT de 30 min, viaja en la cabecera `Authorization` y
 *                     SOLO vive en memoria en el cliente (nunca en storage).
 *  - Refresh token → cookie `HttpOnly` (inaccesible a JavaScript), con `Secure`
 *                     en producción, `SameSite` calculado y rotación en cada uso.
 *  - Token CSRF    → cookie legible por JS (double submit) firmada con HMAC,
 *                     que se envía en la cabecera `X-CSRF-Token`.
 *
 * El refresh token nunca se devuelve en el cuerpo JSON: si aparece en una
 * respuesta, JavaScript podría leerlo y el aislamiento HttpOnly se pierde.
 */

const crypto = require('crypto');

const REFRESH_COOKIE_NAME = 'refreshToken';
const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';

/** La cookie de refresh se limita a las rutas de autenticación. */
const REFRESH_COOKIE_PATH = '/api/auth';
/** La cookie CSRF debe viajar a cualquier ruta de la API (double submit). */
const CSRF_COOKIE_PATH = '/';

/** 7 días, alineado con la caducidad del refresh token en base de datos. */
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CSRF_MAX_AGE_MS = REFRESH_MAX_AGE_MS;

const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * `Secure`: activo en producción por defecto. En local se puede forzar con
 * COOKIE_SECURE=true/false (necesario para probar SameSite=None en http).
 */
function isSecureCookie() {
    const raw = process.env.COOKIE_SECURE;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return isProduction();
}

/**
 * `SameSite`:
 *  - 'auto' (por defecto): 'none' si la petición llega de otro origen (front en
 *    Vercel + API en Railway) y 'strict' si es del mismo origen (desarrollo).
 *  - 'strict' | 'lax' | 'none': valor fijo vía COOKIE_SAME_SITE.
 *
 * SameSite=None exige Secure: si se pide de forma explícita sin HTTPS, la
 * cookie sería rechazada por el navegador, así que se fuerza Secure.
 */
function resolveSameSite(req) {
    const configured = String(process.env.COOKIE_SAME_SITE || 'auto').toLowerCase();

    let sameSite;
    if (['strict', 'lax', 'none'].includes(configured)) {
        sameSite = configured;
    } else {
        sameSite = isCrossSiteRequest(req) ? 'none' : 'strict';
    }

    if (sameSite === 'none' && !isSecureCookie()) {
        // Sin Secure el navegador descarta la cookie SameSite=None.
        return 'strict';
    }
    return sameSite;
}

/** ¿La petición procede de un origen distinto al de la API? */
function isCrossSiteRequest(req) {
    const origin = req?.headers?.origin;
    if (!origin) return false;
    try {
        const originHost = new URL(origin).host;
        const requestHost = req.headers['x-forwarded-host'] || req.headers.host;
        if (!requestHost) return false;
        return originHost !== requestHost;
    } catch (_err) {
        return false;
    }
}

/* ------------------------------------------------------------------ */
/* Parsing de cookies (sin dependencias externas)                      */
/* ------------------------------------------------------------------ */

function parseCookieHeader(header) {
    const cookies = {};
    if (!header || typeof header !== 'string') return cookies;

    for (const part of header.split(';')) {
        const separator = part.indexOf('=');
        if (separator < 0) continue;
        const name = part.slice(0, separator).trim();
        if (!name) continue;
        const rawValue = part.slice(separator + 1).trim();
        try {
            cookies[name] = decodeURIComponent(rawValue);
        } catch (_err) {
            cookies[name] = rawValue;
        }
    }
    return cookies;
}

/** Lee una cookie de la petición. */
function getCookie(req, name) {
    if (!req) return null;
    if (req.cookies && req.cookies[name]) return req.cookies[name];
    const fromHeader = parseCookieHeader(req.headers?.cookie);
    return fromHeader[name] || null;
}

/* ------------------------------------------------------------------ */
/* Token CSRF (double submit firmado)                                  */
/* ------------------------------------------------------------------ */

function csrfSecret() {
    return process.env.CSRF_SECRET || process.env.JWT_SECRET || 'desarrollo-csrf-secret';
}

/**
 * Emite un token CSRF firmado: `<nonce>.<issuedAt>.<hmac>`.
 * La firma HMAC impide que un atacante que consiga inyectar una cookie
 * (cookie tossing desde un subdominio) pueda fabricar un token válido.
 */
function issueCsrfToken() {
    const nonce = crypto.randomBytes(24).toString('hex');
    const issuedAt = Date.now().toString();
    const payload = `${nonce}.${issuedAt}`;
    const signature = crypto.createHmac('sha256', csrfSecret()).update(payload).digest('base64url');
    return `${payload}.${signature}`;
}

/** Valida la firma y la antigüedad de un token CSRF. */
function verifyCsrfToken(token) {
    if (!token || typeof token !== 'string') return false;

    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [nonce, issuedAt, signature] = parts;
    const payload = `${nonce}.${issuedAt}`;
    const expected = crypto.createHmac('sha256', csrfSecret()).update(payload).digest('base64url');

    const provided = Buffer.from(signature);
    const reference = Buffer.from(expected);
    if (provided.length !== reference.length) return false;
    if (!crypto.timingSafeEqual(provided, reference)) return false;

    const timestamp = Number(issuedAt);
    if (!Number.isFinite(timestamp)) return false;
    if (Date.now() - timestamp > CSRF_MAX_AGE_MS) return false;
    if (timestamp - Date.now() > 60 * 1000) return false; // token del futuro

    return true;
}

/** Comparación en tiempo constante de dos cadenas. */
function safeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    if (bufferA.length !== bufferB.length) return false;
    return crypto.timingSafeEqual(bufferA, bufferB);
}

/* ------------------------------------------------------------------ */
/* Escritura de cookies                                                */
/* ------------------------------------------------------------------ */

function setRefreshCookie(res, req, token) {
    res.cookie(REFRESH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: isSecureCookie(),
        sameSite: resolveSameSite(req),
        path: REFRESH_COOKIE_PATH,
        maxAge: REFRESH_MAX_AGE_MS,
    });
}

function clearRefreshCookie(res, req) {
    res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: isSecureCookie(),
        sameSite: resolveSameSite(req),
        path: REFRESH_COOKIE_PATH,
    });
}

function setCsrfCookie(res, req, token) {
    // Legible por JS a propósito: es el patrón "double submit".
    res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: isSecureCookie(),
        sameSite: resolveSameSite(req),
        path: CSRF_COOKIE_PATH,
        maxAge: CSRF_MAX_AGE_MS,
    });
}

function clearCsrfCookie(res, req) {
    res.clearCookie(CSRF_COOKIE_NAME, {
        httpOnly: false,
        secure: isSecureCookie(),
        sameSite: resolveSameSite(req),
        path: CSRF_COOKIE_PATH,
    });
}

/**
 * Emite el par de cookies de sesión y devuelve el token CSRF para
 * incluirlo también en el cuerpo de la respuesta.
 */
function issueSessionCookies(res, req, refreshToken) {
    setRefreshCookie(res, req, refreshToken);
    const csrfToken = issueCsrfToken();
    setCsrfCookie(res, req, csrfToken);
    return csrfToken;
}

/** Borra las cookies de sesión. */
function clearSessionCookies(res, req) {
    clearRefreshCookie(res, req);
    clearCsrfCookie(res, req);
}

module.exports = {
    REFRESH_COOKIE_NAME,
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    REFRESH_COOKIE_PATH,
    CSRF_COOKIE_PATH,
    REFRESH_MAX_AGE_MS,
    CSRF_MAX_AGE_MS,
    isProduction,
    isSecureCookie,
    resolveSameSite,
    isCrossSiteRequest,
    parseCookieHeader,
    getCookie,
    issueCsrfToken,
    verifyCsrfToken,
    safeCompare,
    setRefreshCookie,
    clearRefreshCookie,
    setCsrfCookie,
    clearCsrfCookie,
    issueSessionCookies,
    clearSessionCookies,
};
