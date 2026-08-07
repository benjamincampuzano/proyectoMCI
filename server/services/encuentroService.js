/**
 * Servicio del módulo Encuentros (servidor)
 *
 * Mismo patrón que conventionService. Reutiliza la lógica de pagos.
 */

const {
    calculateBalance,
    getPaymentStatus,
    getPaymentPercentage,
} = require('./conventionPaymentsCore');

/**
 * Determina si un encuentro tiene cupos disponibles.
 */
function hasEncuentroCapacity(encuentro) {
    if (!encuentro) return false;
    const capacity = Number(encuentro.capacity) || 0;
    const enrolled = Number(encuentro.enrolledCount) || 0;
    if (capacity <= 0) return true;
    return enrolled < capacity;
}

/**
 * Calcula el porcentaje de ocupación.
 */
function getEncuentroOccupancy(encuentro) {
    if (!encuentro) return 0;
    const capacity = Number(encuentro.capacity) || 0;
    if (capacity <= 0) return 0;
    const enrolled = Number(encuentro.enrolledCount) || 0;
    return Math.min(100, Math.round((enrolled / capacity) * 100));
}

/**
 * Construye el resumen de pagos.
 */
function buildEncuentroPaymentSummary(registration) {
    return {
        balance: calculateBalance({
            totalPrice: registration.totalPrice,
            payments: registration.payments,
            exempt: registration.exempt,
        }),
        status: getPaymentStatus({
            totalPrice: registration.totalPrice,
            payments: registration.payments,
            exempt: registration.exempt,
        }),
        percentage: getPaymentPercentage({
            totalPrice: registration.totalPrice,
            payments: registration.payments,
            exempt: registration.exempt,
        }),
    };
}

module.exports = {
    hasEncuentroCapacity,
    getEncuentroOccupancy,
    buildEncuentroPaymentSummary,
    calculateBalance,
    getPaymentStatus,
    getPaymentPercentage,
};