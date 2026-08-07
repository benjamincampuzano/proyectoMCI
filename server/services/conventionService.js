/**
 * Servicio del módulo Convenciones (servidor)
 *
 * Lógica de negocio pura que no toca Prisma directamente:
 *  - Cálculos de cupos / capacidad / porcentajes de ocupación.
 *  - Validaciones de inscripciones vs. capacidad.
 *  - Cálculo de saldos pendientes (similar al cliente).
 *
 * Se separa del controller para poder testearlo sin red ni DB.
 */

const {
    sumConfirmedPayments,
    calculateBalance,
    getPaymentStatus,
    getPaymentPercentage,
} = require('./conventionPaymentsCore');

/**
 * Determina si una convención tiene cupos disponibles.
 */
function hasConventionCapacity(convention) {
    if (!convention) return false;
    const capacity = Number(convention.capacity) || 0;
    const enrolled = Number(convention.enrolledCount) || 0;
    if (capacity <= 0) return true; // sin límite, siempre hay cupo
    return enrolled < capacity;
}

/**
 * Calcula el porcentaje de ocupación de una convención.
 */
function getConventionOccupancy(convention) {
    if (!convention) return 0;
    const capacity = Number(convention.capacity) || 0;
    if (capacity <= 0) return 0;
    const enrolled = Number(convention.enrolledCount) || 0;
    return Math.min(100, Math.round((enrolled / capacity) * 100));
}

/**
 * Determina si una inscripción puede proceder según cupos.
 */
function canRegisterForConvention(convention) {
    return hasConventionCapacity(convention);
}

/**
 * Calcula el resumen financiero de una inscripción.
 * Devuelve un objeto con balance, status y porcentaje.
 */
function buildPaymentSummary(registration) {
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
    hasConventionCapacity,
    getConventionOccupancy,
    canRegisterForConvention,
    buildPaymentSummary,
    // Re-exports para mantener compatibilidad
    sumConfirmedPayments,
    calculateBalance,
    getPaymentStatus,
    getPaymentPercentage,
};