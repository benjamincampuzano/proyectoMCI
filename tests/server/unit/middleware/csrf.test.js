/**
 * Tests del módulo: CSRF (middleware de servidor)
 * Cubre: server/middleware/csrf.js
 *
 * Verifica que las peticiones que modifican estado y arrastran la cookie de
 * sesión exijan un token CSRF válido (double submit firmado) y que el header
 * Origin se compruebe en las peticiones mutantes.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { nativeRequire } from '../../helpers/nativeMock.js';

const csrfUrl = new URL('../../../../server/middleware/csrf.js', import.meta.url).href;
const { csrfProtection, verifyOrigin } = nativeRequire(csrfUrl, './csrf.js');
const authCookiesUrl = new URL('../../../../server/utils/authCookies.js', import.meta.url).href;
const { issueCsrfToken } = nativeRequire(authCookiesUrl, './authCookies.js');

function mockRes() {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
}

function mockReq({ method = 'POST', url = '/api/guests', cookies = {}, headers = {} } = {}) {
    const allHeaders = { ...headers };
    const cookieParts = Object.entries(cookies)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([name, value]) => `${name}=${value}`);
    if (cookieParts.length) allHeaders.cookie = cookieParts.join('; ');

    return {
        method,
        url,
        originalUrl: url,
        headers: allHeaders,
        get(name) {
            const key = String(name).toLowerCase();
            return allHeaders[key];
        },
    };
}

describe('Módulo: CSRF — Middleware (servidor)', () => {
    const savedEnv = { ...process.env };

    beforeEach(() => {
        process.env.JWT_SECRET = 'test-secret';
        process.env.NODE_ENV = 'test';
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env = { ...savedEnv };
        vi.restoreAllMocks();
    });

    describe('csrfProtection', () => {
        test('deja pasar los métodos seguros', () => {
            const next = vi.fn();
            csrfProtection(mockReq({ method: 'GET', cookies: { refreshToken: 'r' } }), mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('deja pasar si no hay cookie de sesión (API sin cookie)', () => {
            const next = vi.fn();
            csrfProtection(mockReq({ method: 'POST' }), mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('exige token CSRF si hay cookie de sesión', () => {
            const res = mockRes();
            const next = vi.fn();
            const csrfToken = issueCsrfToken();
            csrfProtection(
                mockReq({ method: 'POST', cookies: { refreshToken: 'r', csrfToken } }),
                res,
                next
            );
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        test('acepta un token CSRF válido que coincide con la cookie', () => {
            const next = vi.fn();
            const csrfToken = issueCsrfToken();
            const req = mockReq({ method: 'POST', cookies: { refreshToken: 'r', csrfToken } });
            req.headers['x-csrf-token'] = csrfToken;
            csrfProtection(req, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('rechaza un token válido que NO coincide con la cookie', () => {
            const res = mockRes();
            const next = vi.fn();
            const cookieToken = issueCsrfToken();
            const otherToken = issueCsrfToken();
            const req = mockReq({ method: 'POST', cookies: { refreshToken: 'r', csrfToken: cookieToken } });
            req.headers['x-csrf-token'] = otherToken;
            csrfProtection(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('rechaza un token con firma inválida', () => {
            const res = mockRes();
            const next = vi.fn();
            const req = mockReq({ method: 'POST', cookies: { refreshToken: 'r', csrfToken: 'a.b.c' } });
            req.headers['x-csrf-token'] = 'a.b.c';
            csrfProtection(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('exime login/register/setup', () => {
            for (const url of ['/api/auth/login', '/api/auth/register', '/api/auth/setup']) {
                const next = vi.fn();
                csrfProtection(mockReq({ method: 'POST', url, cookies: { refreshToken: 'r', csrfToken: 'x' } }), mockRes(), next);
                expect(next).toHaveBeenCalled();
            }
        });

        test('refresh y logout se aceptan sin cookie CSRF (protegidos por SameSite + Origin)', () => {
            for (const url of ['/api/auth/refresh-token', '/api/auth/logout']) {
                const next = vi.fn();
                csrfProtection(mockReq({ method: 'POST', url, cookies: { refreshToken: 'r' } }), mockRes(), next);
                expect(next).toHaveBeenCalled();
            }
        });
    });

    describe('verifyOrigin', () => {
        test('permite peticiones sin Origin (clientes no navegador)', () => {
            const next = vi.fn();
            verifyOrigin(mockReq({ method: 'POST' }), mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('rechaza un origen no permitido en producción', () => {
            process.env.NODE_ENV = 'production';
            const res = mockRes();
            const next = vi.fn();
            verifyOrigin(mockReq({ method: 'POST', headers: { origin: 'https://evil.example' } }), res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        test('permite un origen permitido en producción', () => {
            process.env.NODE_ENV = 'production';
            const next = vi.fn();
            verifyOrigin(
                mockReq({ method: 'POST', headers: { origin: 'https://somos.mcimanizales.com' } }),
                mockRes(),
                next
            );
            expect(next).toHaveBeenCalled();
        });

        test('los métodos seguros no se validan', () => {
            process.env.NODE_ENV = 'production';
            const next = vi.fn();
            verifyOrigin(mockReq({ method: 'GET', headers: { origin: 'https://evil.example' } }), mockRes(), next);
            expect(next).toHaveBeenCalled();
        });
    });
});
