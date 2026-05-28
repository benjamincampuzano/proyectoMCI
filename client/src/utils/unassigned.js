
// utils/unassigned.js
function collect(root){
  const s = new Set();
  (function dfs(n) {
    if (!n) return;
    n.partners?.forEach(p => s.add(p.id));
    n.disciples?.forEach(dfs);
  })(root);
  return s;
}

export function getUnassignedUsers({ allUsers = [], coupleRoot, isAdmin = false }) {
  if (!coupleRoot && !isAdmin) return [];

  if (isAdmin) {
    return Array.isArray(allUsers)
      ? allUsers.filter(u => {
          const roles = u.roles || [];
          if (roles.includes('ADMIN') || roles.includes('PASTOR')) return false;
          return (u.hierarchy || []).length === 0;
        })
      : [];
  }

  // For non-ADMIN users, use the existing logic
  const ids = collect(coupleRoot);
  return Array.isArray(allUsers)
    ? allUsers.filter(u => {
        if (ids.has(u.id)) return false;
        const roles = u.roles || [];
        if (roles.includes('ADMIN')) return false;
        return true;
      })
    : [];
}
