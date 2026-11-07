const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

/**
 * Rate limiters del módulo de "Servidores" (códigos de 6 dígitos).
 *
 * El endpoint de validación es PÚBLICO: sin límite, una IP podría recorrer el
 * espacio de códigos (900.000 combinaciones) y enumerar los nombres de todos
 * los servidores de la congregación. El límite por IP corta esa fuerza bruta:
 * con 20 intentos cada 15 minutos, un barrido completo del espacio llevaría
 * años.
 */

/** Lee un entero positivo del entorno con valor por defecto. */
const envInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const VALIDATION_WINDOW_MS = envInt(process.env.CODE_VALIDATION_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const VALIDATION_MAX = envInt(process.env.CODE_VALIDATION_RATE_LIMIT_MAX, 20);

const CREATE_WINDOW_MS = envInt(process.env.SERVER_CREATE_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000);
const CREATE_MAX = envInt(process.env.SERVER_CREATE_RATE_LIMIT_MAX, 20);

/**
 * Validación de código: límite por IP.
 * Cuenta TODOS los intentos (válidos e inválidos): el objetivo es frenar la
 * enumeración, no sólo los fallos.
 */
const codeValidationLimiter = rateLimit({
    windowMs: VALIDATION_WINDOW_MS,
    max: VALIDATION_MAX,
    message: {
        error: 'Demasiados intentos de validación de código',
        details: `Has alcanzado el límite de ${VALIDATION_MAX} intentos por IP. Por seguridad, espera unos minutos antes de volver a intentarlo.`,
        retryAfter: String(Math.ceil(VALIDATION_WINDOW_MS / 1000)),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    // Los intentos válidos también consumen cuota: si no, un atacante
    // podría calibrar su barrido mezclando aciertos.
    skipSuccessfulRequests: false,
    // No se reponsan las cabeceras estándar en respuestas de error.
    handler: (req, res) => {
        res.status(429).json({
            error: 'Demasiados intentos de validación de código',
            message: 'Demasiados intentos de validación de código. Por seguridad, espera unos minutos antes de volver a intentarlo.',
            retryAfter: Math.ceil(VALIDATION_WINDOW_MS / 1000),
        });
    },
});

/**
 * Creación de códigos: límite por usuario (con respaldo por IP).
 * Evita que un usuario autenticado agote el espacio de códigos creando
 * registros masivamente.
 */
const serverCreateLimiter = rateLimit({
    windowMs: CREATE_WINDOW_MS,
    max: CREATE_MAX,
    message: {
        error: 'Demasiadas creaciones de servidores',
        details: `Has alcanzado el límite de ${CREATE_MAX} creaciones por hora. Por seguridad, espera antes de continuar.`,
        retryAfter: String(Math.ceil(CREATE_WINDOW_MS / 1000)),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
    skipSuccessfulRequests: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Demasiadas creaciones de servidores',
            message: 'Demasiadas creaciones de servidores por hora. Por seguridad, espera antes de continuar.',
            retryAfter: Math.ceil(CREATE_WINDOW_MS / 1000),
        });
    },
});

module.exports = {
    codeValidationLimiter,
    serverCreateLimiter,
    VALIDATION_WINDOW_MS,
    VALIDATION_MAX,
    CREATE_WINDOW_MS,
    CREATE_MAX,
};
