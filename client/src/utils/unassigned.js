// utils/unassigned.js
const LEADERSHIP_ROLES = ['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'];

function collect(root) {
  const ids = new Set();

  (function dfs(node) {
    if (!node) return;

    node.partners?.forEach(partner => ids.add(partner.id));
    node.disciples?.forEach(dfs);
  })(root);

  return ids;
}

function hasHierarchyAssignment(user) {
  if (!user) return false;

  if (user.isUnassignedInHierarchy === false) {
    return true;
  }

  if (Array.isArray(user.hierarchy) && user.hierarchy.length > 0) {
    return true;
  }

  if (Array.isArray(user.parents) && user.parents.length > 0) {
    return true;
  }

  return Boolean(user.pastorId || user.liderDoceId || user.liderCelulaId);
}

function isLeadershipUser(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.some(role => LEADERSHIP_ROLES.includes(role));
}

function isAssignedUser(user) {
  return isLeadershipUser(user) || hasHierarchyAssignment(user);
}

export function getUnassignedUsers({ allUsers = [], coupleRoot, isAdmin = false }) {
  if (!Array.isArray(allUsers)) return [];

  const visibleIds = isAdmin ? null : collect(coupleRoot);

  return allUsers.filter(user => {
    if (!user) return false;

    if (visibleIds && visibleIds.has(user.id)) {
      return false;
    }

    return !isAssignedUser(user);
  });
}
