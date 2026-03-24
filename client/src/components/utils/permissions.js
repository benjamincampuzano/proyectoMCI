// Role helpers
export function isSelfOrPartner(node, currentUserId) {
  if (!currentUserId || !node || !Array.isArray(node.partners)) return false;
  return node.partners.some(p => p.id === currentUserId);
}

// partner in self or ancestors → leader gestiona toda su subred
export function isAncestorOrSelfPartner(ancestors, node, currentUserId) {
  if (isSelfOrPartner(node, currentUserId)) return true;
  return ancestors?.some(a => isSelfOrPartner(a, currentUserId));
}

export function canAddToNode({ node, ancestors = [], currentUser }) {
  const roles = currentUser?.roles || [];
  const uid = currentUser?.id;
  if (roles.includes('ADMIN')) return true;
  if (roles.includes('LIDER_DOCE') || roles.includes('LIDER_CELULA')) {
    return isAncestorOrSelfPartner(ancestors, node, uid);
  }
  return false;
}

export function canRemoveFromNode({ node, ancestors = [], currentUser, level = 0 }) {
  const roles = currentUser?.roles || [];
  const uid = currentUser?.id;
  if (level === 0) return false; // no remover raíz
  if (roles.includes('ADMIN')) return true;
  if (roles.includes('LIDER_DOCE') || roles.includes('LIDER_CELULA')) {
    return isAncestorOrSelfPartner(ancestors, node, uid);
  }
  return false;
}

export function canManageAssignments(currentUser) {
  const roles = currentUser?.roles || [];
  return roles.includes('ADMIN') || roles.includes('LIDER_DOCE') || roles.includes('LIDER_CELULA');
}