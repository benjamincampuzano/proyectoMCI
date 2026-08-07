/**
 * Validadores de Convenciones (servidor)
 *
 * Versión servidor de las validaciones, con mensajes en español
 * adaptados a respuestas HTTP (mensajes más detallados).
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;

function validateConventionRegistration(data = {}) {
    const errors = [];

    const fullName = (data.fullName || '').trim();
    if (!fullName) {
        errors.push({ field: 'fullName', message: 'El nombre completo es obligatorio.' });
    } else if (fullName.length < 3) {
        errors.push({ field: 'fullName', message: 'El nombre debe tener al menos 3 caracteres.' });
    }

    const email = (data.email || '').trim().toLowerCase();
    if (!email) {
        errors.push({ field: 'email', message: 'El correo electrónico es obligatorio.' });
    } else if (!EMAIL_REGEX.test(email)) {
        errors.push({ field: 'email', message: `El correo "${email}" no tiene un formato válido.` });
    }

    const phone = (data.phone || '').trim();
    if (!phone) {
        errors.push({ field: 'phone', message: 'El teléfono es obligatorio.' });
    } else if (!PHONE_REGEX.test(phone)) {
        errors.push({ field: 'phone', message: `El teléfono "${phone}" no tiene un formato válido.` });
    }

    return { valid: errors.length === 0, errors };
}

function validatePaymentAmount(amount) {
    const num = Number(amount);
    if (!Number.isFinite(num)) {
        return { valid: false, message: 'El monto debe ser un número válido.' };
    }
    if (num < 0) {
        return { valid: false, message: 'El monto no puede ser negativo.' };
    }
    if (num > 50_000_000) {
        return { valid: false, message: 'El monto excede el máximo permitido.' };
    }
    return { valid: true, amount: num };
}

function validateConventionDates(startDate, endDate) {
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

module.exports = {
    validateConventionRegistration,
    validatePaymentAmount,
    validateConventionDates,
};