/**
 * Servicio del módulo Ganar (servidor)
 *
 * Lógica de transición de estado de invitados.
 * Esta es la versión servidor, sincronizada con client/src/utils/guestStatus.js
 * para mantener una única fuente conceptual de verdad.
 */

const STATUS_ORDER = ['NUEVO', 'CONTACTADO', 'CONSOLIDADO', 'GANADO'];

const GUEST_STATUS = {
    NUEVO: 'NUEVO',
    CONTACTADO: 'CONTACTADO',
    CONSOLIDADO: 'CONSOLIDADO',
    GANADO: 'GANADO',
    INACTIVO: 'INACTIVO',
};

/**
 * Devuelve true si la transición es válida.
 * - INACTIVO es estado terminal (no transiciona a otro).
 * - Cualquier estado activo puede pasar a INACTIVO.
 */
function canTransitionTo(current, next) {
    if (!current || !next) return false;
    if (current === GUEST_STATUS.INACTIVO) return false;
    if (next === GUEST_STATUS.INACTIVO) return true;

    const ci = STATUS_ORDER.indexOf(current);
    const ni = STATUS_ORDER.indexOf(next);
    if (ci === -1 || ni === -1) return false;
    return ni >= ci;
}

/**
 * Deriva el estado según flags.
 */
function deriveStatus({ called = false, visited = false, consolidated = false } = {}) {
    if (consolidated) return GUEST_STATUS.GANADO;
    if (visited) return GUEST_STATUS.CONSOLIDADO;
    if (called) return GUEST_STATUS.CONTACTADO;
    return GUEST_STATUS.NUEVO;
}

/**
 * Devuelve una lista de transiciones válidas desde el estado actual.
 */
function getValidTransitions(current) {
    if (current === GUEST_STATUS.INACTIVO) return [];
    const idx = STATUS_ORDER.indexOf(current);
    if (idx === -1) return [GUEST_STATUS.INACTIVO];
    return [...STATUS_ORDER.slice(idx), GUEST_STATUS.INACTIVO];
}

/**
 * Valida que un invitado pueda ser contactado (no esté INACTIVO).
 */
function isContactable(guest) {
    if (!guest) return false;
    return guest.status !== GUEST_STATUS.INACTIVO;
}

module.exports = {
    GUEST_STATUS,
    canTransitionTo,
    deriveStatus,
    getValidTransitions,
    isContactable,
};