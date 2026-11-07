const { randomInt, randomBytes } = require('crypto');
const { validatePassword } = require('./passwordValidator');

/**
 * Genera una contraseña temporal aleatoria con un CSPRNG (crypto.randomInt).
 *
 * Garantiza al menos una mayúscula, una minúscula, un número y un símbolo, y
 * baraja los caracteres con el mismo generador criptográfico (un `sort()` con
 * `Math.random()` introduciría sesgo y es predecible).
 *
 * @param {number} length Longitud total (mínimo 8).
 * @returns {string} Contraseña temporal.
 */
const generateTempPassword = (length = 10) => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const syms = '!@#$%^&*+-_';

  const chars = [];
  chars.push(upper[randomInt(0, upper.length)]);
  chars.push(lower[randomInt(0, lower.length)]);
  chars.push(nums[randomInt(0, nums.length)]);
  chars.push(syms[randomInt(0, syms.length)]);

  const all = upper + lower + nums + syms;
  for (let i = 0; i < length - 4; i++) {
    chars.push(all[randomInt(0, all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
};

/**
 * Genera una contraseña temporal que cumple la política de contraseñas del
 * proyecto. Si por azar la cadena aleatoria incumple la política (p. ej. que
 * contenga el nombre del usuario), se regenera.
 *
 * @param {{email?: string, fullName?: string}} context Datos del usuario destino.
 * @param {{length?: number, maxAttempts?: number}} options
 * @returns {{password: string, validation: {isValid: boolean, message: string}}}
 */
const generateCompliantTempPassword = (context = {}, { length = 12, maxAttempts = 10 } = {}) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const password = generateTempPassword(length);
    const validation = validatePassword(password, context);
    if (validation.isValid) {
      return { password, validation };
    }
  }

  // Red de seguridad: prefijo fijo + 11 bytes aleatorios en base64url.
  const fallback = `Mci${randomBytes(8).toString('base64url')}!`;
  return { password: fallback, validation: validatePassword(fallback, context) };
};

module.exports = { generateTempPassword, generateCompliantTempPassword };
