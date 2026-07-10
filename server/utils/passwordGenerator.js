const { randomInt } = require('crypto');

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

module.exports = { generateTempPassword };
