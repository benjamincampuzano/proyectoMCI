/**
 * Cálculos de pagos para la Escuela de Artes.
 *
 * Reutiliza la lógica de pagos de Convenciones (mismo modelo:
 * precio total + lista de abonos + exonerado).
 *
 * Diferencias específicas del módulo de Artes:
 *  - Descuento por inscripción múltiple (segunda clase 10% off).
 *  - Cálculo de precio con descuento aplicado.
 */

import {
    PAYMENT_STATUS,
    sumConfirmedPayments,
    calculateBalance,
    getPaymentStatus,
    getPaymentPercentage,
    getPaymentStatusLabel,
    getPaymentStatusColor,
} from './conventionPayments.js';

/**
 * Aplica descuento por inscripción múltiple.
 * - 1 clase: 0%
 * - 2 clases: 10%
 * - 3+ clases: 15%
 *
 * @param {number} totalPrice - Precio total sin descuento
 * @param {number} classesCount - Cantidad de clases en las que se inscribe
 * @returns {number} Precio final con descuento
 */
export function applyMultipleClassesDiscount(totalPrice, classesCount) {
    const price = Number(totalPrice) || 0;
    const count = Number(classesCount) || 0;
    if (count <= 1) return price;
    if (count === 2) return Math.round(price * 0.9);
    return Math.round(price * 0.85); // 3+
}

/**
 * Determina si una inscripción está atrasada en sus pagos.
 * (heurística: saldo pendiente > 0 y la fecha actual supera el inicio de la clase).
 */
export function isEnrollmentOverdue({ startDate, totalPrice, payments = [] } = {}) {
    if (!startDate) return false;
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return false;
    const now = new Date();
    if (now < start) return false;
    const balance = calculateBalance({ totalPrice, payments });
    return balance > 0;
}

export {
    PAYMENT_STATUS,
    sumConfirmedPayments,
    calculateBalance,
    getPaymentStatus,
    getPaymentPercentage,
    getPaymentStatusLabel,
    getPaymentStatusColor,
    applyMultipleClassesDiscount,
    isEnrollmentOverdue,
};

export default {
    PAYMENT_STATUS,
    sumConfirmedPayments,
    calculateBalance,
    getPaymentStatus,
    getPaymentPercentage,
    getPaymentStatusLabel,
    getPaymentStatusColor,
    applyMultipleClassesDiscount,
    isEnrollmentOverdue,
};