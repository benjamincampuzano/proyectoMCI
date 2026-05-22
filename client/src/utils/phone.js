/**
 * Formats a phone number for WhatsApp links
 * @param {string} phoneStr - Raw phone number
 * @returns {string} - Formatted phone number for wa.me
 */
export function getWhatsAppPhone(phoneStr) {
    if (!phoneStr) return '';

    const stripped = phoneStr.replace(/\D/g, '');

    if (stripped.startsWith('+')) {
        return stripped.replace('+', '');
    }

    if (stripped.length === 10 && stripped.startsWith('3')) {
        return `57${stripped}`;
    }

    return stripped;
}
