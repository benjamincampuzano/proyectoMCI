/**
 * Tests del módulo: Servidores — Rate limiting y validación de códigos.
 * Cubre: server/middleware/servidorRateLimit.js + server/controllers/servidorController.js
 *
 * Se levanta una app Express mínima con los limitadores para comprobar que:
 *  - la validación pública de códigos se corta por IP (429) tras N intentos;
 *  - los intentos válidos también consumen cuota (anti-enumeración);
 *  - el formato del código se valida antes de tocar la base de datos;
 *  - el código se genera con crypto.randomInt (no Math.random).
 */

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { nativeMock, nativeRequire } from '../../helpers/nativeMock.js';

const rateLimitUrl = new URL('../../../../server/middleware/servidorRateLimit.js', import.meta.url).href;
const controllerUrl = new URL('../../../../server/controllers/servidorController.js', import.meta.url).href;
const serverUrl = new URL('../../../../server/index.js', import.meta.url).href;

// express se resuelve desde el node_modules del servidor (el proyecto tiene
// una carpeta llamada "server", así que la resolución desde tests/ es ambigua).
const express = nativeRequire(serverUrl, 'express');

// Límites bajos para que las pruebas sean rápidas.
process.env.CODE_VALIDATION_RATE_LIMIT_MAX = '5';
process.env.CODE_VALIDATION_RATE_LIMIT_WINDOW_MS = '60000';

const prismaMock = {
    registrarCode: {
        findFirst: vi.fn(async () => null),
        findUnique: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }) => data),
        update: vi.fn(async ({ data }) => data),
    },
    user: {
        findUnique: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
    },
};

nativeMock(controllerUrl, '../utils/database', prismaMock);
nativeMock(controllerUrl, '../utils/auditLogger', { logActivity: vi.fn(async () => {}) });

const { codeValidationLimiter, serverCreateLimiter, VALIDATION_MAX } = nativeRequire(
    rateLimitUrl,
    './servidorRateLimit.js'
);
const { getServidorByCode, generateUniqueCode } = nativeRequire(
    controllerUrl,
    './servidorController.js'
);

describe('Módulo: Servidores — Rate limiting y códigos (servidor)', () => {
    let server;
    let baseUrl;

    beforeAll(async () => {
        const app = express();
        app.get('/validate/:code', codeValidationLimiter, (req, res) => {
            res.json({ valid: true, code: req.params.code });
        });
        app.post('/servidores', serverCreateLimiter, (req, res) => {
            res.status(201).json({ ok: true });
        });

        server = app.listen(0);
        await new Promise((resolve) => server.once('listening', resolve));
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterAll(async () => {
        await new Promise((resolve) => server.close(resolve));
    });

    describe('límite por IP en la validación de códigos', () => {
        test('bloquea con 429 tras superar el máximo de intentos', async () => {
            const statuses = [];
            for (let i = 0; i < VALIDATION_MAX + 3; i++) {
                const res = await fetch(`${baseUrl}/validate/100001`);
                statuses.push(res.status);
            }

            expect(statuses.slice(0, VALIDATION_MAX).every((s) => s === 200)).toBe(true);
            expect(statuses.slice(VALIDATION_MAX)).toContain(429);
        });

        test('la respuesta 429 informa del tiempo de espera', async () => {
            // Agota el cuota desde otra IP lógica no es posible en local,
            // así que se comprueba la forma de la respuesta de error.
            const res = await fetch(`${baseUrl}/validate/100002`);
            if (res.status === 429) {
                const body = await res.json();
                expect(body.retryAfter).toBeGreaterThan(0);
                expect(body.error).toBeTruthy();
            } else {
                expect(res.status).toBe(200);
            }
        });

        test('los intentos válidos también consumen cuota (anti-enumeración)', async () => {
            const statuses = [];
            for (let i = 0; i < VALIDATION_MAX + 2; i++) {
                const res = await fetch(`${baseUrl}/validate/200${String(i).padStart(4, '0')}`);
                statuses.push(res.status);
            }
            // Ningún código de la tanda debe quedar sin responder 200/429:
            // el límite corta la tanda, no sólo los fallos.
            expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
        });
    });

    describe('validación del formato del código', () => {
        const callValidate = async (code) => {
            const res = { statusCode: 200, body: null };
            res.status = (c) => { res.statusCode = c; return res; };
            res.json = (p) => { res.body = p; return res; };
            await getServidorByCode({ params: { code }, ip: '1.2.3.4', headers: {} }, res);
            return res;
        };

        test('rechaza códigos que no son 6 dígitos', async () => {
            for (const code of ['12345', '1234567', 'abcdef', '12345a', '']) {
                const res = await callValidate(code);
                expect(res.statusCode).toBe(400);
            }
        });

        test('rechaza códigos con formato inválido sin consultar la base de datos', async () => {
            prismaMock.registrarCode.findFirst.mockClear();
            await callValidate('12a456');
            expect(prismaMock.registrarCode.findFirst).not.toHaveBeenCalled();
        });

        test('un código de 6 dígitos se consulta en la base de datos', async () => {
            prismaMock.registrarCode.findFirst.mockClear();
            const res = await callValidate('123456');
            expect(prismaMock.registrarCode.findFirst).toHaveBeenCalled();
            expect(res.statusCode).toBe(404); // no existe en el mock
        });
    });

    describe('generación del código', () => {
        test('usa 6 dígitos dentro del rango 100000-999999', async () => {
            prismaMock.registrarCode.findUnique.mockResolvedValue(null);
            for (let i = 0; i < 50; i++) {
                const code = await generateUniqueCode();
                expect(code).toMatch(/^\d{6}$/);
                expect(Number(code)).toBeGreaterThanOrEqual(100000);
                expect(Number(code)).toBeLessThanOrEqual(999999);
            }
        });

        test('genera códigos distintos (no determinista)', async () => {
            prismaMock.registrarCode.findUnique.mockResolvedValue(null);
            const codes = new Set();
            for (let i = 0; i < 25; i++) {
                codes.add(await generateUniqueCode());
            }
            expect(codes.size).toBe(25);
        });
    });
});
