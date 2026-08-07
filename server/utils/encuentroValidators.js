/**
 * Validadores de Encuentros (servidor)
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;
const ENCUENTRO_MODALIDADES = ['PRESENCIAL', 'VIRTUAL', 'MIXTA'];

function validateEncuentroRegistration(data = {}) {
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

    const modalidad = (data.modalidad || '').trim().toUpperCase();
    if (modalidad && !ENCUENTRO_MODALIDADES.includes(modalidad)) {
        errors.push({ field: 'modalidad', message: `Modalidad inválida. Debe ser: ${ENCUENTRO_MODALIDADES.join(', ')}.` });
    }

    return { valid: errors.length === 0, errors };
}

function isEncuentroDateValid(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return false;
    return date >= new Date();
}

module.exports = {
    ENCUENTRO_MODALIDADES,
    validateEncuentroRegistration,
    isEncuentroDateValid,
};