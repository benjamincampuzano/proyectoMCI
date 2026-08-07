/**
 * Validadores del módulo Encuentros (cliente)
 *
 * Similar a conventionValidators, pero con reglas propias del módulo
 * (Encuentro tiene campos adicionales como modalidad — presencial/virtual).
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;

export const ENCUENTRO_MODALIDADES = ['PRESENCIAL', 'VIRTUAL', 'MIXTA'];

/**
 * Valida el objeto de inscripción a un encuentro.
 */
export function validateEncuentroRegistration(data = {}) {
    const errors = [];

    const fullName = (data.fullName || '').trim();
    if (!fullName) {
        errors.push('El nombre completo es obligatorio.');
    } else if (fullName.length < 3) {
        errors.push('El nombre debe tener al menos 3 caracteres.');
    }

    const email = (data.email || '').trim().toLowerCase();
    if (!email) {
        errors.push('El correo electrónico es obligatorio.');
    } else if (!EMAIL_REGEX.test(email)) {
        errors.push(`El correo "${email}" no tiene un formato válido.`);
    }

    const phone = (data.phone || '').trim();
    if (!phone) {
        errors.push('El teléfono es obligatorio.');
    } else if (!PHONE_REGEX.test(phone)) {
        errors.push(`El teléfono "${phone}" no tiene un formato válido.`);
    }

    const modalidad = (data.modalidad || '').trim().toUpperCase();
    if (modalidad && !ENCUENTRO_MODALIDADES.includes(modalidad)) {
        errors.push(`La modalidad debe ser una de: ${ENCUENTRO_MODALIDADES.join(', ')}.`);
    }

    if (data.age !== undefined && data.age !== null && data.age !== '') {
        const ageNum = Number(data.age);
        if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 120) {
            errors.push('La edad debe estar entre 0 y 120 años.');
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Valida que la fecha del encuentro sea futura.
 */
export function isEncuentroDateValid(dateStr, now = new Date()) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return false;
    return date >= now;
}

export default {
    ENCUENTRO_MODALIDADES,
    validateEncuentroRegistration,
    isEncuentroDateValid,
};
