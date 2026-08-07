/**
 * Helpers puros extraídos de useUserManagement para poder testearlos.
 */

/**
 * Calcula la edad (en años) a partir de una fecha de nacimiento.
 * Devuelve null si birthDate es vacío/inválido.
 */
export function calculateAge(birthDate) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

/**
 * Determina el rol primario de un usuario a partir de su array de roles.
 * Si no encuentra ninguno, devuelve 'SIN_ROL'.
 */
export function getPrimaryRole(roles) {
    if (!Array.isArray(roles)) return 'SIN_ROL';
    const KNOWN = ['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO', 'INVITADO'];
    return roles.find((r) => KNOWN.includes(r)) || 'SIN_ROL';
}

/**
 * Devuelve true si el usuario puede editar a otros usuarios (rol suficiente).
 */
export function canEditUser(currentUser) {
    if (!currentUser) return false;
    const roles = currentUser.roles || [currentUser.role];
    return roles.some((r) => ['ADMIN', 'PASTOR', 'LIDER_DOCE'].includes(String(r).toUpperCase()));
}

/**
 * Devuelve true si el usuario puede crear usuarios nuevos.
 * (más restrictivo que canEdit)
 */
export function canCreateUsers(currentUser) {
    if (!currentUser) return false;
    const roles = currentUser.roles || [currentUser.role];
    return roles.some((r) => ['ADMIN', 'LIDER_DOCE'].includes(String(r).toUpperCase()));
}

/**
 * Devuelve la lista de roles que el usuario actual puede asignar.
 */
export function getAssignableRoles(currentUser) {
    if (!currentUser || !currentUser.roles) return [];
    const upper = currentUser.roles.map((r) => String(r).toUpperCase());
    if (upper.includes('ADMIN')) {
        return ['DISCIPULO', 'LIDER_CELULA', 'LIDER_DOCE', 'PASTOR', 'ADMIN'];
    }
    if (upper.includes('PASTOR')) {
        return ['DISCIPULO', 'LIDER_CELULA', 'LIDER_DOCE', 'PASTOR'];
    }
    return ['DISCIPULO', 'LIDER_CELULA'];
}

/**
 * Categoriza un mensaje de error para mostrarlo en el modal.
 * Devuelve { title, type } según palabras clave en el mensaje.
 */
export function categorizeError(message = '') {
    const errorMessage = String(message);
    let title = 'Error';
    let type = 'error';

    if (/correo electrónico|email/i.test(errorMessage)) {
        title = 'Error de Correo Electrónico';
        type = 'email';
    } else if (/teléfono|phone/i.test(errorMessage)) {
        title = 'Error de Teléfono';
        type = 'phone';
    } else if (/documento|document/i.test(errorMessage)) {
        title = 'Error de Documento';
        type = 'document';
    } else if (/contraseña|password/i.test(errorMessage)) {
        title = 'Error de Contraseña';
        type = 'password';
    } else if (/permiso|permission|unauthorized/i.test(errorMessage)) {
        title = 'Error de Permisos';
        type = 'permission';
    } else if (/servidor|server/i.test(errorMessage)) {
        title = 'Error del Servidor';
        type = 'server';
    }

    return { title, message: errorMessage, type };
}

export default {
    calculateAge,
    getPrimaryRole,
    canEditUser,
    canCreateUsers,
    getAssignableRoles,
    categorizeError,
};
