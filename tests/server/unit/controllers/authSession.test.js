/**
 * Tests de integración: flujo de sesión con cookies HttpOnly.
 * Cubre: server/controllers/authController.js + server/middleware/csrf.js
 *
 * Se ejecuta el controlador real con Prisma simulado (sin tocar ninguna base
 * de datos) para verificar el contrato completo:
 *  - el refresh token NUNCA aparece en el cuerpo JSON;
 *  - se entrega en una cookie HttpOnly (+ Secure en producción);
 *  - el endpoint de refresh lee el token de la cookie;
 *  - el middleware CSRF exige el token firmado en las peticiones mutantes;
 *  - la contraseña temporal del reset la genera el servidor, no el cliente.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { nativeMock, nativeRequire } from '../../helpers/nativeMock.js';

const authControllerUrl = new URL('../../../../server/controllers/authController.js', import.meta.url).href;
const csrfUrl = new URL('../../../../server/middleware/csrf.js', import.meta.url).href;
const authCookiesUrl = new URL('../../../../server/utils/authCookies.js', import.meta.url).href;
const passwordValidatorUrl = new URL('../../../../server/utils/passwordValidator.js', import.meta.url).href;

// ── Prisma simulado ───────────────────────────────────────────────────────
const state = {
    refreshTokens: new Map(),
    user: null,
    userUpdate: null,
    loginAttempts: [],
};

const prismaMock = {
    loginAttempt: {
        count: vi.fn(async () => 0),
        create: vi.fn(async ({ data }) => {
            state.loginAttempts.push(data);
            return data;
        }),
    },
    user: {
        findFirst: vi.fn(async () => state.user),
        findUnique: vi.fn(async () => state.user),
        update: vi.fn(async ({ where, data }) => {
            state.userUpdate = { where, data };
            return { ...state.user, ...data };
        }),
    },
    refreshToken: {
        create: vi.fn(async ({ data }) => {
            const record = { id: state.refreshTokens.size + 1, isRevoked: false, createdAt: new Date(), ...data };
            state.refreshTokens.set(data.token, record);
            return record;
        }),
        deleteMany: vi.fn(async () => ({ count: 0 })),
        findUnique: vi.fn(async ({ where }) => {
            const record = state.refreshTokens.get(where.token);
            if (!record) return null;
            return { ...record, user: state.user };
        }),
        updateMany: vi.fn(async ({ where, data }) => {
            let count = 0;
            for (const record of state.refreshTokens.values()) {
                const matchId = where.id === undefined || where.id === record.id;
                const matchToken = !where.token || where.token === record.token;
                const matchUser = !where.userId || where.userId === record.userId;
                const matchRevoked = where.isRevoked === undefined || where.isRevoked === record.isRevoked;
                if (matchId && matchToken && matchUser && matchRevoked) {
                    Object.assign(record, data);
                    count += 1;
                }
            }
            return { count };
        }),
    },
    moduleCoordinator: {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
    },
    moduleSubCoordinator: {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
    },
    moduleTreasurer: {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
    },
};

nativeMock(authControllerUrl, '../utils/database', prismaMock);
nativeMock(authControllerUrl, '../utils/auditLogger', { logActivity: vi.fn(async () => {}) });
nativeMock(authControllerUrl, '../middleware/coordinatorAuth', {
    normalizeModuleName: (name) => String(name || '').toLowerCase(),
    getUserModuleCoordinations: async () => [],
    isModuleCoordinator: vi.fn(async () => false),
});
nativeMock(authControllerUrl, '../utils/networkUtils', { getUserNetwork: async () => [] });

const { login, refreshToken: refreshController, logout, forcePasswordChange } = nativeRequire(
    authControllerUrl,
    './authController.js'
);
const { csrfProtection } = nativeRequire(csrfUrl, './csrf.js');
const { issueCsrfToken, REFRESH_COOKIE_NAME, CSRF_COOKIE_NAME } = nativeRequire(
    authCookiesUrl,
    './authCookies.js'
);
const { validatePassword } = nativeRequire(passwordValidatorUrl, './passwordValidator.js');

/** Respuesta Express simulada que captura cookies y cuerpo. */
function mockRes() {
    const res = { cookies: [], body: null, statusCode: 200 };
    res.cookie = (name, value, options) => {
        res.cookies.push({ name, value, options });
        return res;
    };
    res.clearCookie = (name, options) => {
        res.cookies.push({ name, value: '', options, cleared: true });
        return res;
    };
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (payload) => {
        res.body = payload;
        return res;
    };
    return res;
}

function mockReq({
    method = 'POST',
    url = '/api/auth/login',
    body = {},
    cookies = {},
    headers = {},
    user = { id: 1, roles: ['ADMIN'] },
    params = {},
} = {}) {
    const allHeaders = { ...headers };
    const cookieParts = Object.entries(cookies)
        .filter(([, v]) => v)
        .map(([name, value]) => `${name}=${value}`);
    if (cookieParts.length) allHeaders.cookie = cookieParts.join('; ');

    return {
        method,
        url,
        originalUrl: url,
        body,
        headers: allHeaders,
        ip: '127.0.0.1',
        user,
        params,
        get(name) {
            return allHeaders[String(name).toLowerCase()];
        },
    };
}

describe('Integración: Sesión con cookie HttpOnly (servidor)', () => {
    const savedEnv = { ...process.env };

    beforeEach(() => {
        process.env.JWT_SECRET = 'test-secret';
        process.env.NODE_ENV = 'test';
        state.refreshTokens.clear();
        state.loginAttempts.length = 0;
        state.userUpdate = null;
        vi.clearAllMocks();
    });

    afterEach(() => {
        process.env = { ...savedEnv };
    });

    const setUpUser = async () => {
        const bcrypt = nativeRequire(authControllerUrl, 'bcryptjs');
        const passwordHash = await bcrypt.hash('Password1!', 4);
        state.user = {
            id: 7,
            email: 'test@example.com',
            password: passwordHash,
            isActive: true,
            isDeleted: false,
            mustChangePassword: false,
            profile: { fullName: 'Usuario Test' },
            roles: [{ role: { name: 'ADMIN' } }],
            moduleCoordinations: [],
            moduleSubCoordinations: [],
            moduleTreasurers: [],
        };
    };

    test('login entrega el refresh token en cookie HttpOnly y NO en el cuerpo', async () => {
        await setUpUser();
        const res = mockRes();

        await login(mockReq({ body: { email: 'test@example.com', password: 'Password1!' } }), res);

        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeTruthy();
        expect(res.body.refreshToken).toBeUndefined();
        expect(res.body.csrfToken).toBeTruthy();

        const refreshCookie = res.cookies.find((c) => c.name === REFRESH_COOKIE_NAME);
        expect(refreshCookie).toBeDefined();
        expect(refreshCookie.options.httpOnly).toBe(true);
        expect(refreshCookie.options.path).toBe('/api/auth');
        expect(res.cookies.find((c) => c.name === CSRF_COOKIE_NAME).options.httpOnly).toBe(false);
    });

    test('el refresh lee el token de la cookie, no del cuerpo', async () => {
        await setUpUser();
        const loginRes = mockRes();
        await login(mockReq({ body: { email: 'test@example.com', password: 'Password1!' } }), loginRes);

        const cookieValue = loginRes.cookies.find((c) => c.name === REFRESH_COOKIE_NAME).value;

        // Sin cookie → 401 aunque se mande el token en el cuerpo
        const sinCookie = mockRes();
        await refreshController(
            mockReq({ url: '/api/auth/refresh-token', body: { refreshToken: cookieValue } }),
            sinCookie
        );
        expect(sinCookie.statusCode).toBe(401);

        // Con la cookie → nuevo access token y cookie rotada
        const conCookie = mockRes();
        await refreshController(
            mockReq({ url: '/api/auth/refresh-token', cookies: { [REFRESH_COOKIE_NAME]: cookieValue } }),
            conCookie
        );
        expect(conCookie.statusCode).toBe(200);
        expect(conCookie.body.token).toBeTruthy();
        expect(conCookie.body.refreshToken).toBeUndefined();
        const nueva = conCookie.cookies.find((c) => c.name === REFRESH_COOKIE_NAME);
        expect(nueva.value).not.toBe(cookieValue);
    });

    test('el reseteo de contrasena genera la contrasena en el servidor', async () => {
        await setUpUser();
        const bcrypt = nativeRequire(authControllerUrl, 'bcryptjs');

        const res = mockRes();
        await forcePasswordChange(
            mockReq({
                url: '/api/auth/force-password-change/7',
                params: { userId: '7' },
                body: { newTempPassword: 'PropuestaDelCliente1!' },
                headers: { 'user-agent': 'vitest' },
            }),
            res
        );

        expect(res.statusCode).toBe(200);

        // 1) La contrasena la genera el servidor: ignora la propuesta del cliente.
        expect(res.body.tempPassword).toBeTruthy();
        expect(res.body.tempPassword).not.toBe('PropuestaDelCliente1!');

        // 2) Cumple la politica de contrasenas del proyecto.
        expect(validatePassword(res.body.tempPassword, { email: 'test@example.com' }).isValid).toBe(true);

        // 3) Lo que se guarda es el hash, nunca la contrasena en claro.
        expect(state.userUpdate.data.password).not.toBe(res.body.tempPassword);
        expect(await bcrypt.compare(res.body.tempPassword, state.userUpdate.data.password)).toBe(true);

        // 4) El usuario queda obligado a cambiar la contrasena.
        expect(state.userUpdate.data.mustChangePassword).toBe(true);
        expect(res.body.mustChangePassword).toBe(true);
    });

    test('logout revoca el token de la cookie y limpia las cookies', async () => {
        await setUpUser();
        const loginRes = mockRes();
        await login(mockReq({ body: { email: 'test@example.com', password: 'Password1!' } }), loginRes);
        const cookieValue = loginRes.cookies.find((c) => c.name === REFRESH_COOKIE_NAME).value;

        const res = mockRes();
        await logout(mockReq({ url: '/api/auth/logout', cookies: { [REFRESH_COOKIE_NAME]: cookieValue } }), res);

        expect(res.statusCode).toBe(200);
        expect(res.cookies.filter((c) => c.cleared).map((c) => c.name)).toEqual([
            REFRESH_COOKIE_NAME,
            CSRF_COOKIE_NAME,
        ]);
        expect(state.refreshTokens.get(cookieValue).isRevoked).toBe(true);
    });

    test('una mutacion con cookie de sesion exige el token CSRF valido', async () => {
        const csrfToken = issueCsrfToken();
        const sinToken = mockRes();
        csrfProtection(
            mockReq({
                method: 'PUT',
                url: '/api/guests/1',
                cookies: { [REFRESH_COOKIE_NAME]: 'r', [CSRF_COOKIE_NAME]: csrfToken },
            }),
            sinToken,
            vi.fn()
        );
        expect(sinToken.statusCode).toBe(403);

        const conToken = mockRes();
        const next = vi.fn();
        const req = mockReq({
            method: 'PUT',
            url: '/api/guests/1',
            cookies: { [REFRESH_COOKIE_NAME]: 'r', [CSRF_COOKIE_NAME]: csrfToken },
        });
        req.headers['x-csrf-token'] = csrfToken;
        csrfProtection(req, conToken, next);
        expect(next).toHaveBeenCalled();
    });
});
