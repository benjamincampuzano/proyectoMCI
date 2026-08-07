/**
 * Cálculos de pagos y saldo del módulo Convenciones.
 *
 * Centraliza la lógica de:
 *  - Calcular el saldo pendiente (precio total - suma de abonos).
 *  - Determinar el estado de pago (PENDIENTE / PARCIAL / PAGADO / EXONERADO).
 *  - Calcular el porcentaje pagado.
 *
 * Esta función se testea de forma aislada porque es la fuente única
 * de verdad para mostrar el saldo en ConvencionTable y ConvencionesReport.
 */

export const PAYMENT_STATUS = {
    PENDIENTE: 'PENDIENTE',
    PARCIAL: 'PARCIAL',
    PAGADO: 'PAGADO',
    EXONERADO: 'EXONERADO',
};

/**
 * Suma el monto de los pagos confirmados. Acepta pagos con `status` válido
 * o sin status (compatibilidad con datos legacy).
 */
export function sumConfirmedPayments(payments = []) {
    if (!Array.isArray(payments)) return 0;
    return payments
        .filter((p) => !p.status || ['CONFIRMADO', 'PAGADO', 'APROBADO'].includes(p.status))
        .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
}

/**
 * Devuelve el saldo pendiente. Si está exonerado, devuelve 0.
 */
export function calculateBalance({ totalPrice = 0, payments = [], exempt = false } = {}) {
    if (exempt) return 0;
    const paid = sumConfirmedPayments(payments);
    const total = Number(totalPrice) || 0;
    return Math.max(0, total - paid);
}

/**
 * Devuelve el estado de pago.
 */
export function getPaymentStatus({ totalPrice = 0, payments = [], exempt = false } = {}) {
    if (exempt) return PAYMENT_STATUS.EXONERADO;
    const paid = sumConfirmedPayments(payments);
    const total = Number(totalPrice) || 0;
    if (paid <= 0) return PAYMENT_STATUS.PENDIENTE;
    if (paid >= total) return PAYMENT_STATUS.PAGADO;
    return PAYMENT_STATUS.PARCIAL;
}

/**
 * Devuelve el porcentaje pagado (0-100).
 */
export function getPaymentPercentage({ totalPrice = 0, payments = [], exempt = false } = {}) {
    if (exempt) return 100;
    const total = Number(totalPrice) || 0;
    if (total <= 0) return 100; // sin precio, lo consideramos cubierto
    const paid = sumConfirmedPayments(payments);
    return Math.min(100, Math.round((paid / total) * 100));
}

/**
 * Etiqueta legible en español del estado de pago.
 */
export function getPaymentStatusLabel(status) {
    switch (status) {
        case PAYMENT_STATUS.PENDIENTE: return 'Pendiente';
        case PAYMENT_STATUS.PARCIAL: return 'Pago parcial';
        case PAYMENT_STATUS.PAGADO: return 'Pagado';
        case PAYMENT_STATUS.EXONERADO: return 'Exonerado';
        default: return 'Desconocido';
    }
}

/**
 * Color sugerido para badge según el estado.
 */
export function getPaymentStatusColor(status) {
    switch (status) {
        case PAYMENT_STATUS.PENDIENTE: return 'error';
        case PAYMENT_STATUS.PARCIAL: return 'warning';
        case PAYMENT_STATUS.PAGADO: return 'success';
        case PAYMENT_STATUS.EXONERADO: return 'info';
        default: return 'gray';
    }
}

export default {
    PAYMENT_STATUS,
    sumConfirmedPayments,
    calculateBalance,
    getPaymentStatus,
    getPaymentPercentage,
    getPaymentStatusLabel,
    getPaymentStatusColor,
};
