/**
 * Date utilities that respect local timezone (Colombia UTC-5)
 * Always use these functions instead of toISOString() to avoid timezone shift issues
 */

export const getLocalDateString = (date = null) => {
  const d = date ? new Date(date) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayString = () => getLocalDateString();

export const formatDateSpanish = (dateStr) => {
  if (!dateStr) return '...';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const toLocaleDateString = (date, format = 'en-CA') => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString(format === 'en-CA' ? 'en-CA' : format);
};
