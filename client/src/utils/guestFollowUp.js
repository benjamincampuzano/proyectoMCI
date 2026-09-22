export const getLastCall = (guest) => guest?.calls?.[0] || null;

export const getLastVisit = (guest) => guest?.visits?.[0] || null;

export const formatShortDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatShortDateTime = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Alertas por retraso junto al estado (extraído de GuestTracking.getAlerts).
 * - Llamada pendiente si 1+ días sin llamadas.
 * - Visita pendiente si 2+ días sin visitas.
 * - Inasistencia si 30+ días sin asistencia a iglesia/célula.
 */
export const getGuestAlerts = (guest) => {
  if (!guest) return [];
  const createdAt = guest.createdAt ? new Date(guest.createdAt) : new Date();
  const now = new Date();
  const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
  const hasCalls = Array.isArray(guest.calls) && guest.calls.length > 0;
  const hasVisits = Array.isArray(guest.visits) && guest.visits.length > 0;

  const lastChurchAttendance =
    Array.isArray(guest.churchAttendances) && guest.churchAttendances.length > 0
      ? new Date(guest.churchAttendances[0].date)
      : null;
  const daysSinceLastChurch = lastChurchAttendance
    ? Math.floor((now - lastChurchAttendance) / (1000 * 60 * 60 * 24))
    : diffDays;

  const alerts = [];
  if (diffDays >= 1 && !hasCalls) alerts.push({ type: 'call', message: 'Llamada pendiente (1+ días)' });
  if (diffDays >= 2 && !hasVisits) alerts.push({ type: 'visit', message: 'Visita pendiente (2+ días)' });
  if (daysSinceLastChurch > 30) alerts.push({ type: 'attendance', message: 'Inasistencia a iglesia/célula (+1 mes)' });
  return alerts;
};

export const STATUS_LABELS = {
  NUEVO: 'Nuevo',
  CONTACTADO: 'Llamado',
  CONSOLIDADO: 'Visitado',
  GANADO: 'Consolidado',
};

export const getGuestStatusLabel = (status) => STATUS_LABELS[status] || status || 'N/A';
