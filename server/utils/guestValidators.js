/**
 * Validadores del módulo Ganar (servidor)
 *
 * Valida los datos de un invitado antes de ser creado/actualizado.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;
const VALID_STATUS = ['NUEVO', 'CONTACTADO', 'CONSOLIDADO', 'GANADO', 'INACTIVO'];

function validateGuest(data = {}) {
    const errors = [];

    const fullName = (data.fullName || '').trim();
    if (!fullName) {
        errors.push({ field: 'fullName', message: 'El nombre completo es obligatorio.' });
    } else if (fullName.length < 3) {
        errors.push({ field: 'fullName', message: 'El nombre debe tener al menos 3 caracteres.' });
    } else if (fullName.length > 100) {
        errors.push({ field: 'fullName', message: 'El nombre no puede tener más de 100 caracteres.' });
    }

    const email = (data.email || '').trim().toLowerCase();
    if (email && !EMAIL_REGEX.test(email)) {
        errors.push({ field: 'email', message: `El correo "${email}" no tiene un formato válido.` });
    }

    const phone = (data.phone || '').trim();
    if (phone && !PHONE_REGEX.test(phone)) {
        errors.push({ field: 'phone', message: `El teléfono "${phone}" no tiene un formato válido.` });
    }

    if (data.status && !VALID_STATUS.includes(data.status)) {
        errors.push({ field: 'status', message: `Estado inválido. Debe ser uno de: ${VALID_STATUS.join(', ')}.` });
    }

    return { valid: errors.length === 0, errors };
}

module.exports = { validateGuest };