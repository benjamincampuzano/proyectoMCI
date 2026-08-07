/**
 * Validadores del módulo Escuela de Artes (cliente)
 *
 * Reglas específicas de inscripción a una clase de arte:
 *  - Cupo disponible (capacity - enrolled <= 0 → llena).
 *  - Edad mínima/máxima según la clase.
 *  - Nombre completo válido.
 *  - Email válido.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;

/**
 * Verifica si la clase tiene cupos disponibles.
 */
export function hasAvailableSeats(artClass) {
    if (!artClass) return false;
    const capacity = Number(artClass.capacity) || 0;
    const enrolled = Number(artClass.enrolledCount) || 0;
    if (capacity <= 0) return false; // sin capacidad definida
    return enrolled < capacity;
}

/**
 * Valida la inscripción a una clase de arte.
 */
export function validateArtClassEnrollment({ data = {}, artClass = {} } = {}) {
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
    if (phone && !PHONE_REGEX.test(phone)) {
        errors.push(`El teléfono "${phone}" no tiene un formato válido.`);
    }

    // Validar edad contra minAge/maxAge de la clase
    if (data.age !== undefined && data.age !== null && data.age !== '') {
        const ageNum = Number(data.age);
        if (!Number.isFinite(ageNum)) {
            errors.push('La edad debe ser un número válido.');
        } else {
            if (artClass.minAge !== undefined && ageNum < artClass.minAge) {
                errors.push(`La edad mínima para esta clase es ${artClass.minAge} años.`);
            }
            if (artClass.maxAge !== undefined && ageNum > artClass.maxAge) {
                errors.push(`La edad máxima para esta clase es ${artClass.maxAge} años.`);
            }
        }
    }

    // Validar cupo disponible
    if (!hasAvailableSeats(artClass)) {
        errors.push('La clase no tiene cupos disponibles.');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Calcula el porcentaje de ocupación de la clase.
 */
export function getClassOccupancy(artClass) {
    if (!artClass) return 0;
    const capacity = Number(artClass.capacity) || 0;
    if (capacity <= 0) return 0;
    const enrolled = Number(artClass.enrolledCount) || 0;
    return Math.min(100, Math.round((enrolled / capacity) * 100));
}

/**
 * Etiqueta legible según la ocupación.
 */
export function getOccupancyLabel(artClass) {
    const pct = getClassOccupancy(artClass);
    if (pct >= 100) return 'Completa';
    if (pct >= 80) return 'Casi llena';
    if (pct >= 50) return 'Media ocupación';
    if (pct > 0) return 'Disponible';
    return 'Vacía';
}

export default {
    hasAvailableSeats,
    validateArtClassEnrollment,
    getClassOccupancy,
    getOccupancyLabel,
};
