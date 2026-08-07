/**
 * Servicio del módulo Escuela de Artes (servidor)
 *
 * Lógica de:
 *  - Cupo disponible por clase.
 *  - Cálculo de descuentos por inscripción múltiple.
 *  - Estado de pago.
 */

const {
    calculateBalance,
    getPaymentStatus,
    getPaymentPercentage,
} = require('./conventionPaymentsCore');

/**
 * Determina si una clase tiene cupos disponibles.
 */
function hasArtClassCapacity(artClass) {
    if (!artClass) return false;
    const capacity = Number(artClass.capacity) || 0;
    const enrolled = Number(artClass.enrolledCount) || 0;
    if (capacity <= 0) return false;
    return enrolled < capacity;
}

/**
 * Aplica descuento por inscripción a múltiples clases.
 */
function applyMultipleClassesDiscount(totalPrice, classesCount) {
    const price = Number(totalPrice) || 0;
    const count = Number(classesCount) || 0;
    if (count <= 1) return price;
    if (count === 2) return Math.round(price * 0.9);
    return Math.round(price * 0.85);
}

/**
 * Calcula el porcentaje de ocupación.
 */
function getArtClassOccupancy(artClass) {
    if (!artClass) return 0;
    const capacity = Number(artClass.capacity) || 0;
    if (capacity <= 0) return 0;
    const enrolled = Number(artClass.enrolledCount) || 0;
    return Math.min(100, Math.round((enrolled / capacity) * 100));
}

/**
 * Valida que la edad del inscrito esté dentro del rango de la clase.
 */
function isAgeWithinRange(age, artClass) {
    if (!artClass) return false;
    const ageNum = Number(age);
    if (!Number.isFinite(ageNum)) return false;
    if (artClass.minAge !== undefined && ageNum < artClass.minAge) return false;
    if (artClass.maxAge !== undefined && ageNum > artClass.maxAge) return false;
    return true;
}

/**
 * Construye resumen de pagos con descuento aplicado.
 */
function buildArtSchoolPaymentSummary(registration) {
    const finalPrice = applyMultipleClassesDiscount(
        registration.totalPrice,
        registration.classesCount || 1,
    );
    return {
        originalPrice: Number(registration.totalPrice) || 0,
        finalPrice,
        discount: (Number(registration.totalPrice) || 0) - finalPrice,
        balance: calculateBalance({
            totalPrice: finalPrice,
            payments: registration.payments,
            exempt: registration.exempt,
        }),
        status: getPaymentStatus({
            totalPrice: finalPrice,
            payments: registration.payments,
            exempt: registration.exempt,
        }),
        percentage: getPaymentPercentage({
            totalPrice: finalPrice,
            payments: registration.payments,
            exempt: registration.exempt,
        }),
    };
}

module.exports = {
    hasArtClassCapacity,
    applyMultipleClassesDiscount,
    getArtClassOccupancy,
    isAgeWithinRange,
    buildArtSchoolPaymentSummary,
    calculateBalance,
    getPaymentStatus,
    getPaymentPercentage,
};