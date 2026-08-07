/**
 * Validadores de Escuela de Artes (servidor)
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;

function validateArtClassEnrollment({ data = {}, artClass = {} } = {}) {
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

    if (data.age !== undefined && data.age !== null && data.age !== '') {
        const ageNum = Number(data.age);
        if (!Number.isFinite(ageNum)) {
            errors.push({ field: 'age', message: 'La edad debe ser un número válido.' });
        } else {
            if (artClass.minAge !== undefined && ageNum < artClass.minAge) {
                errors.push({ field: 'age', message: `La edad mínima para esta clase es ${artClass.minAge} años.` });
            }
            if (artClass.maxAge !== undefined && ageNum > artClass.maxAge) {
                errors.push({ field: 'age', message: `La edad máxima para esta clase es ${artClass.maxAge} años.` });
            }
        }
    }

    const capacity = Number(artClass.capacity) || 0;
    const enrolled = Number(artClass.enrolledCount) || 0;
    if (capacity > 0 && enrolled >= capacity) {
        errors.push({ field: 'artClass', message: 'La clase no tiene cupos disponibles.' });
    }

    return { valid: errors.length === 0, errors };
}

module.exports = {
    validateArtClassEnrollment,
};