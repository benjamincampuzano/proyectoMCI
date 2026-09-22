import { ROLES } from '../constants/roles';

const rolesOf = (user) => (Array.isArray(user?.roles) ? user.roles : []);

const hasRole = (user, role) => rolesOf(user).includes(role);

const isGanarCoordinator = (auth) => {
  if (!auth) return false;
  if (typeof auth.isCoordinator === 'function') return auth.isCoordinator('ganar');
  return !!auth.isModuleCoordinator;
};

/**
 * Puede registrar llamadas/visitas/WhatsApp.
 * El servidor protege POST /:id/calls y /:id/visits solo con autenticación
 * + checkCoordinatorStatus (sin restricción de rol), por lo que cualquier
 * usuario autenticado con acceso al módulo puede registrar seguimiento.
 */
export const canRegisterFollowUp = (user) => !!user;

/** Puede enviar WhatsApp (regla que ya usaba GuestTracking en la UI). */
export const canSendWhatsApp = (user, auth) => {
  if (!user) return false;
  return (
    hasRole(user, ROLES.ADMIN) ||
    hasRole(user, ROLES.PASTOR) ||
    hasRole(user, ROLES.LIDER_DOCE) ||
    isGanarCoordinator(auth)
  );
};

/**
 * Puede borrar llamadas/visitas.
 * Alinea UI con servidor (server/controllers/guestController.js deleteCall/
 * deleteVisit): ADMIN o PASTOR/LIDER_DOCE/LIDER_CELULA dentro de su red.
 * Se incluye además al coordinador/subcoordinador de Ganar, que la UI ya
 * contemplaba aunque el servidor no lo chequea explícitamente.
 */
export const canDeleteFollowUp = (user, auth) => {
  if (!user) return false;
  if (hasRole(user, ROLES.ADMIN)) return true;
  if (isGanarCoordinator(auth)) return true;
  if (typeof auth?.isSubCoordinator === 'function' && auth.isSubCoordinator('ganar')) return true;
  return (
    hasRole(user, ROLES.PASTOR) ||
    hasRole(user, ROLES.LIDER_DOCE) ||
    hasRole(user, ROLES.LIDER_CELULA)
  );
};

/** Puede editar datos del invitado (abre detalle/edición). */
export const canEditGuest = (user, auth) => {
  if (!user) return false;
  if (hasRole(user, ROLES.ADMIN)) return true;
  if (hasRole(user, ROLES.LIDER_DOCE)) return true;
  if (isGanarCoordinator(auth)) return true;
  if (typeof auth?.isSubCoordinator === 'function' && auth.isSubCoordinator('ganar')) return true;
  return false;
};

/** Puede convertir a discípulo. La UI actual lo oculta solo a PASTOR. */
export const canConvertGuest = (user) => {
  if (!user) return false;
  return !hasRole(user, ROLES.PASTOR);
};

/** Puede eliminar invitados. Misma matriz que edición. */
export const canDeleteGuest = (user, auth) => canEditGuest(user, auth);

export const __testables = { rolesOf, hasRole, isGanarCoordinator };
