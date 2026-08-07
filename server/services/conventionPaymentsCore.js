/**
 * Core de pagos compartido entre Convenciones, Encuentros y Escuela de Artes.
 *
 * Cálculos puros (sin DB) que se usan en cliente (re-exportado desde
 * client/src/utils/conventionPayments.js) y servidor.
 */

function sumConfirmedPayments(payments = []) {
    if (!Array.isArray(payments)) return 0;
    return payments
        .filter((p) => !p.status || ['CONFIRMADO', 'PAGADO', 'APROBADO'].includes(p.status))
        .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
}

function calculateBalance({ totalPrice = 0, payments = [], exempt = false } = {}) {
    if (exempt) return 0;
    const paid = sumConfirmedPayments(payments);
    const total = Number(totalPrice) || 0;
    return Math.max(0, total - paid);
}

function getPaymentStatus({ totalPrice = 0, payments = [], exempt = false } = {}) {
    if (exempt) return 'EXONERADO';
    const paid = sumConfirmedPayments(payments);
    const total = Number(totalPrice) || 0;
    if (paid <= 0) return 'PENDIENTE';
    if (paid >= total) return 'PAGADO';
    return 'PARCIAL';
}

function getPaymentPercentage({ totalPrice = 0, payments = [], exempt = false } = {}) {
    if (exempt) return 100;
    const total = Number(totalPrice) || 0;
    if (total <= 0) return 100;
    const paid = sumConfirmedPayments(payments);
    return Math.min(100, Math.round((paid / total) * 100));
}

module.exports = {
    sumConfirmedPayments,
    calculateBalance,
    getPaymentStatus,
    getPaymentPercentage,
};