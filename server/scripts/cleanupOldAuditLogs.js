const prisma = require('../utils/database');

/**
 * Limpia registros viejos de AuditLog para controlar el tamaño de la tabla.
 *
 * Estrategia:
 * - Elimina TOKEN_REFRESH y LOGIN_FAILED con más de 7 días (no tienen valor histórico)
 * - Elimina todos los demás registros con más de 90 días
 *
 * Se ejecuta desde el cron en index.js (diariamente a las 2 AM).
 */
const cleanupOldAuditLogs = async () => {
    const now = new Date();

    // Ruido de alto volumen: TOKEN_REFRESH y LOGIN_FAILED — conservar solo 7 días
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Registros históricos útiles: conservar 90 días
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    try {
        // 1. Eliminar ruido de tokens y logins fallidos > 7 días
        const noisyDeleted = await prisma.auditLog.deleteMany({
            where: {
                action: { in: ['TOKEN_REFRESH', 'LOGIN_FAILED'] },
                createdAt: { lt: sevenDaysAgo }
            }
        });

        // 2. Eliminar logs históricos generales > 90 días
        const oldDeleted = await prisma.auditLog.deleteMany({
            where: {
                action: { notIn: ['TOKEN_REFRESH', 'LOGIN_FAILED'] },
                createdAt: { lt: ninetyDaysAgo }
            }
        });

        const total = noisyDeleted.count + oldDeleted.count;

        if (total > 0 && process.env.NODE_ENV !== 'production') {
            console.log(
                `🧹 AuditLog cleanup: ${noisyDeleted.count} registros de ruido (>7d) + ` +
                `${oldDeleted.count} registros históricos (>90d) eliminados`
            );
        }

        return total;
    } catch (error) {
        console.error('Error en cleanupOldAuditLogs:', error);
        return 0;
    }
};

module.exports = { cleanupOldAuditLogs };
