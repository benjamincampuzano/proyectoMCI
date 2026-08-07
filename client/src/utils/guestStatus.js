/**
 * Lógica de transición de estado de invitados del módulo "Ganar".
 *
 * Ciclo de vida:
 *   NUEVO → CONTACTADO → CONSOLIDADO → GANADO
 *
 * También cubre estados auxiliares:
 *   - PENDIENTE_LLAMADA  (todavía no se contactó)
 *   - PENDIENTE_VISITA   (contactado pero sin visita)
 *   - INACTIVO           (baja lógica)
 *
 * Esta función se extrajo de los componentes GuestList / GuestTracking /
 * GuestEditModal para tener una sola fuente de verdad y poder testearla
 * sin necesidad de renderizar React.
 */

export const GUEST_STATUS = {
    NUEVO: 'NUEVO',
    CONTACTADO: 'CONTACTADO',
    CONSOLIDADO: 'CONSOLIDADO',
    GANADO: 'GANADO',
    INACTIVO: 'INACTIVO',
};

/**
 * Orden jerárquico de los estados (de menor a mayor avance).
 * Permite responder "¿puede pasar al estado X?".
 */
const STATUS_ORDER = [
    GUEST_STATUS.NUEVO,
    GUEST_STATUS.CONTACTADO,
    GUEST_STATUS.CONSOLIDADO,
    GUEST_STATUS.GANADO,
];

/**
 * Devuelve true si `next` representa un avance (o igual) desde `current`
 * dentro del ciclo de vida. Estados INACTIVO son terminales y no transicionan.
 */
export function canTransitionTo(current, next) {
    if (!current || !next) return false;
    if (current === GUEST_STATUS.INACTIVO) return false;
    if (next === GUEST_STATUS.INACTIVO) return true; // se puede inactivar desde cualquiera

    const ci = STATUS_ORDER.indexOf(current);
    const ni = STATUS_ORDER.indexOf(next);
    if (ci === -1 || ni === -1) return false;
    return ni >= ci;
}

/**
 * Calcula el siguiente estado lógico del invitado según sus flags
 * (`called`, `visited`, `consolidated`).
 *
 * Reglas:
 *  - Si no fue llamado ni visitado → NUEVO
 *  - Si fue llamado pero no visitado → CONTACTADO
 *  - Si fue visitado pero no consolidado → CONSOLIDADO
 *  - Si fue consolidado → GANADO
 */
export function deriveStatus({ called = false, visited = false, consolidated = false } = {}) {
    if (consolidated) return GUEST_STATUS.GANADO;
    if (visited) return GUEST_STATUS.CONSOLIDADO;
    if (called) return GUEST_STATUS.CONTACTADO;
    return GUEST_STATUS.NUEVO;
}

/**
 * Determina si el invitado requiere una llamada pendiente
 * (estado NUEVO sin llamada registrada).
 */
export function hasPendingCall(guest) {
    if (!guest) return false;
    if (guest.status === GUEST_STATUS.INACTIVO) return false;
    return !guest.called;
}

/**
 * Determina si el invitado requiere una visita pendiente
 * (fue contactado pero todavía no fue visitado a una célula).
 */
export function hasPendingVisit(guest) {
    if (!guest) return false;
    if (guest.status === GUEST_STATUS.INACTIVO) return false;
    return Boolean(guest.called) && !guest.visited;
}

/**
 * Etiqueta legible en español para mostrar al usuario.
 */
export function getStatusLabel(status) {
    switch (status) {
        case GUEST_STATUS.NUEVO: return 'Nuevo';
        case GUEST_STATUS.CONTACTADO: return 'Contactado';
        case GUEST_STATUS.CONSOLIDADO: return 'Consolidado';
        case GUEST_STATUS.GANADO: return 'Ganado';
        case GUEST_STATUS.INACTIVO: return 'Inactivo';
        default: return 'Desconocido';
    }
}

/**
 * Color sugerido (para badges / chips) por estado.
 * Devuelve un string con el nombre del color del sistema de tokens.
 */
export function getStatusColor(status) {
    switch (status) {
        case GUEST_STATUS.NUEVO: return 'info';
        case GUEST_STATUS.CONTACTADO: return 'warning';
        case GUEST_STATUS.CONSOLIDADO: return 'primary';
        case GUEST_STATUS.GANADO: return 'success';
        case GUEST_STATUS.INACTIVO: return 'gray';
        default: return 'gray';
    }
}

export default {
    GUEST_STATUS,
    canTransitionTo,
    deriveStatus,
    hasPendingCall,
    hasPendingVisit,
    getStatusLabel,
    getStatusColor,
};
