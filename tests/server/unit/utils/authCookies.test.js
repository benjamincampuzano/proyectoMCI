/**
 * Tests del módulo: Auth Cookies (utilidades de servidor)
 * Cubre: server/utils/authCookies.js
 *
 * Verifica el parseo de cookies, la emisión/validación del token CSRF
 * firmado y la resolución de SameSite/Secure según el entorno.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { nativeRequire } from '../../helpers/nativeMock.js';

const authCookiesUrl = new URL('../../../../server/utils/authCookies.js', import.meta.url).href;
const {
    REFRESH_COOKIE_NAME,
    CSRF_COOKIE_NAME,
    parseCookieHeader,
    getCookie,
    issueCsrfToken,
    verifyCsrfToken,
    safeCompare,
    resolveSameSite,
    isSecureCookie,
    isCrossSiteRequest,
    setRefreshCookie,
    clearRefreshCookie,
    setCsrfCookie,
    issueSessionCookies,
    clearSessionCookies,
} = nativeRequire(authCookiesUrl, './authCookies.js');

/** Respuesta falsa que captura las cookies emitidas. */
function mockRes() {
    const cookies = [];
    return {
        cookies,
        cookie(name, value, options) {
            cookies.push({ name, value, options });
            return this;
        },
        clearCookie(name, options) {
            cookies.push({ name, value: '', options, cleared: true });
            return this;
        },
    };
}

describe('Módulo: Auth — Cookies y CSRF (servidor)', () => {
    const savedEnv = { ...process.env };

    beforeEach(() => {
        process.env.JWT_SECRET = 'test-secret';
        delete process.env.CSRF_SECRET;
        delete process.env.COOKIE_SECURE;
        delete process.env.COOKIE_SAME_SITE;
    });

    afterEach(() => {
        process.env = { ...savedEnv };
    });

    describe('parseCookieHeader', () => {
        test('parsea varias cookies', () => {
            const cookies = parseCookieHeader('refreshToken=abc; csrfToken=def; other=1');
            expect(cookies.refreshToken).toBe('abc');
            expect(cookies.csrfToken).toBe('def');
            expect(cookies.other).toBe('1');
        });

        test('decodifica valores percent-encoded', () => {
            expect(parseCookieHeader('refreshToken=a%2Bb').refreshToken).toBe('a+b');
        });

        test('devuelve vacío si no hay cabecera', () => {
            expect(parseCookieHeader(undefined)).toEqual({});
            expect(parseCookieHeader('')).toEqual({});
        });

        test('ignora pares sin "="', () => {
            expect(parseCookieHeader('novalue; a=1')).toEqual({ a: '1' });
        });
    });

    describe('getCookie', () => {
        test('lee de la cabecera Cookie', () => {
            const req = { headers: { cookie: 'refreshToken=xyz' } };
            expect(getCookie(req, REFRESH_COOKIE_NAME)).toBe('xyz');
        });

        test('prefiere req.cookies si existe', () => {
            const req = { headers: { cookie: 'refreshToken=fromHeader' }, cookies: { refreshToken: 'fromParser' } };
            expect(getCookie(req, REFRESH_COOKIE_NAME)).toBe('fromParser');
        });

        test('devuelve null si no existe', () => {
            expect(getCookie({ headers: {} }, REFRESH_COOKIE_NAME)).toBeNull();
        });
    });

    describe('token CSRF', () => {
        test('el token emitido es válido', () => {
            const token = issueCsrfToken();
            expect(verifyCsrfToken(token)).toBe(true);
        });

        test('un token manipulado es inválido', () => {
            const token = issueCsrfToken();
            const [nonce, issuedAt, sig] = token.split('.');
            expect(verifyCsrfToken(`${nonce}.${issuedAt}.${sig.slice(0, -2)}xx`)).toBe(false);
        });

        test('un token con otra firma es inválido', () => {
            const token = issueCsrfToken();
            const forged = issueCsrfToken();
            expect(verifyCsrfToken(forged)).toBe(true);
            expect(verifyCsrfToken(`${token.split('.')[0]}.${token.split('.')[1]}.${forged.split('.')[2]}`)).toBe(false);
        });

        test('rechaza valores malformados', () => {
            expect(verifyCsrfToken('')).toBe(false);
            expect(verifyCsrfToken('abc')).toBe(false);
            expect(verifyCsrfToken(null)).toBe(false);
            expect(verifyCsrfToken(undefined)).toBe(false);
        });

        test('un token firmado con otra clave no valida', () => {
            const token = issueCsrfToken();
            process.env.CSRF_SECRET = 'otra-clave';
            expect(verifyCsrfToken(token)).toBe(false);
        });
    });

    describe('safeCompare', () => {
        test('compara cadenas iguales', () => {
            expect(safeCompare('abc', 'abc')).toBe(true);
        });

        test('diferentes longitudes -> false', () => {
            expect(safeCompare('abc', 'abcd')).toBe(false);
        });

        test('valores no string -> false', () => {
            expect(safeCompare(null, 'abc')).toBe(false);
        });
    });

    describe('resolución de SameSite y Secure', () => {
        test('same-origin -> strict', () => {
            const req = { headers: { origin: 'http://localhost:5173', host: 'localhost:5173' } };
            expect(resolveSameSite(req)).toBe('strict');
            expect(isCrossSiteRequest(req)).toBe(false);
        });

        test('cross-origin -> none (y exige Secure)', () => {
            process.env.COOKIE_SECURE = 'true';
            const req = { headers: { origin: 'https://app.example.com', host: 'api.example.com' } };
            expect(resolveSameSite(req)).toBe('none');
            expect(isCrossSiteRequest(req)).toBe(true);
        });

        test('COOKIE_SAME_SITE fuerza un valor', () => {
            process.env.COOKIE_SAME_SITE = 'lax';
            const req = { headers: { origin: 'https://app.example.com', host: 'api.example.com' } };
            expect(resolveSameSite(req)).toBe('lax');
        });

        test('sameSite=none sin Secure degrada a strict', () => {
            process.env.COOKIE_SAME_SITE = 'none';
            process.env.COOKIE_SECURE = 'false';
            const req = { headers: { host: 'api.example.com' } };
            expect(resolveSameSite(req)).toBe('strict');
        });

        test('Secure activo en producción', () => {
            process.env.NODE_ENV = 'production';
            expect(isSecureCookie()).toBe(true);
        });

        test('Secure desactivado en desarrollo', () => {
            process.env.NODE_ENV = 'development';
            expect(isSecureCookie()).toBe(false);
        });
    });

    describe('escritura de cookies', () => {
        test('la cookie de refresh es HttpOnly y no sale en el cuerpo', () => {
            const res = mockRes();
            const req = { headers: { host: 'localhost:5000' } };
            setRefreshCookie(res, req, 'token-123');

            expect(res.cookies).toHaveLength(1);
            const [cookie] = res.cookies;
            expect(cookie.name).toBe(REFRESH_COOKIE_NAME);
            expect(cookie.value).toBe('token-123');
            expect(cookie.options.httpOnly).toBe(true);
            expect(cookie.options.path).toBe('/api/auth');
            expect(cookie.options.maxAge).toBeGreaterThan(0);
        });

        test('la cookie CSRF es legible por JS (double submit)', () => {
            const res = mockRes();
            const req = { headers: { host: 'localhost:5000' } };
            setCsrfCookie(res, req, 'csrf-abc');
            expect(res.cookies[0].options.httpOnly).toBe(false);
            expect(res.cookies[0].options.path).toBe('/');
        });

        test('issueSessionCookies emite ambas cookies y devuelve el token CSRF', () => {
            const res = mockRes();
            const req = { headers: { host: 'localhost:5000' } };
            const csrfToken = issueSessionCookies(res, req, 'refresh-abc');

            expect(verifyCsrfToken(csrfToken)).toBe(true);
            expect(res.cookies.map((c) => c.name)).toEqual([REFRESH_COOKIE_NAME, CSRF_COOKIE_NAME]);
        });

        test('clearSessionCookies borra ambas con los mismos atributos', () => {
            const res = mockRes();
            const req = { headers: { host: 'localhost:5000' } };
            clearSessionCookies(res, req);
            expect(res.cookies.map((c) => c.name)).toEqual([REFRESH_COOKIE_NAME, CSRF_COOKIE_NAME]);
            expect(res.cookies.every((c) => c.cleared)).toBe(true);
        });
    });
});
