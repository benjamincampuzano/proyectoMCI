const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

/**
 * Rate limiter para descargas de backup
 * Máximo 3 backups por hora por IP
 */
const backupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hora
    max: 3,
    message: { 
        error: 'Demasiadas solicitudes de backup',
        details: 'Has alcanzado el límite de 3 backups por hora. Por favor espera antes de intentar nuevamente.',
        retryAfter: '3600'  // segundos
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Usar user ID si está autenticado, sino usar IP con manejo IPv6
        return req.user?.id || ipKeyGenerator(req);
    }
});

/**
 * Rate limiter para restauraciones
 * Máximo 2 restores por hora por IP (operación más crítica)
 */
const restoreLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hora
    max: 2,
    message: { 
        error: 'Demasiadas solicitudes de restauración',
        details: 'Has alcanzado el límite de 2 restauraciones por hora. Por seguridad, espera antes de intentar nuevamente.',
        retryAfter: '3600'  // segundos
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id || ipKeyGenerator(req);
    }
});

module.exports = {
    backupLimiter,
    restoreLimiter
};
