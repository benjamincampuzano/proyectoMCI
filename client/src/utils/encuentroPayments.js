/**
 * Reexporta la lógica de pagos de Convenciones para Encuentros.
 *
 * El modelo de pagos de Encuentros es idéntico al de Convenciones
 * (precio total + lista de abonos + exonerado), por lo que se reutilizan
 * las mismas funciones puras. Este módulo existe para:
 *   1. Dar una API explícita al módulo Encuentros.
 *   2. Servir como punto de extensión si en el futuro el modelo diverge.
 */

export {
    PAYMENT_STATUS,
    sumConfirmedPayments,
    calculateBalance,
    getPaymentStatus,
    getPaymentPercentage,
    getPaymentStatusLabel,
    getPaymentStatusColor,
} from './conventionPayments.js';

export { default } from './conventionPayments.js';
