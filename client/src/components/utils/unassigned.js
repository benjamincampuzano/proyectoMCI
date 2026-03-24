// utils/unassigned.js
// Devuelve los usuarios que NO están presentes en el árbol de parejas actual
function collectIdsInCoupleTree(root) {
  const ids = new Set();
  function dfs(node) {
    if (!node) return;
    (node.partners || []).forEach(p => ids.add(p.id));
    (node.disciples || []).forEach(dfs);
  }
  dfs(root);
  return ids;
}

export function getUnassignedUsers({ allUsers = [], coupleRoot }) {
  if (!Array.isArray(allUsers) || !coupleRoot) return [];
  const presentIds = collectIdsInCoupleTree(coupleRoot);
  return allUsers.filter(u => !presentIds.has(u.id));
}