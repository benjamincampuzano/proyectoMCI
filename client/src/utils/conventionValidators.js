/**
 * Validadores del módulo Convenciones (cliente)
 *
 * Funciones puras que validan los datos de una inscripción / pago a una
 * convención. Se separan del componente para poder testearlos sin React.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;

/**
 * Valida el objeto de inscripción a una convención.
 * Devuelve { valid: boolean, errors: string[] }.
 */
export function validateConventionRegistration(data = {}) {
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

    if (data.age !== undefined && data.age !== null && data.age !== '') {
        const ageNum = Number(data.age);
        if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 120) {
            errors.push('La edad debe estar entre 0 y 120 años.');
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Valida que un monto sea un número positivo.
 */
export function validatePaymentAmount(amount) {
    const num = Number(amount);
    if (!Number.isFinite(num)) {
        return { valid: false, message: 'El monto debe ser un número válido.' };
    }
    if (num < 0) {
        return { valid: false, message: 'El monto no puede ser negativo.' };
    }
    return { valid: true, amount: num };
}

/**
 * Valida las fechas de inicio/fin de una convención.
 * inicio debe ser <= fin.
 */
export function validateConventionDates(startDate, endDate) {
    if (!startDate || !endDate) {
        return { valid: false, message: 'Las fechas de inicio y fin son obligatorias.' };
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return { valid: false, message: 'Las fechas no tienen un formato válido.' };
    }
    if (start > end) {
        return { valid: false, message: 'La fecha de inicio no puede ser posterior a la fecha de fin.' };
    }
    return { valid: true };
}

export default {
    validateConventionRegistration,
    validatePaymentAmount,
    validateConventionDates,
};
