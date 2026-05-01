import { ROLES } from '../constants/roles';

/**
 * Construye una jerarquía personalizada según el rol del usuario actual
 * @param {Object} network - La red completa de discipulado
 * @param {Object} currentUser - El usuario actual
 * @returns {Object} - La jerarquía personalizada
 */
export function buildCustomHierarchy(network, currentUser) {
  if (!network || !currentUser) return null;

  const userRole = currentUser.roles?.[0];
  const userId = currentUser.id;

  function findNodeById(node, targetId) {
    if (!node) return null;

    // Node is a couple (has partners array)
    if (node.partners) {
      if (node.partners.some(p => p.id === targetId)) {
        return node;
      }

      for (const disciple of node.disciples || []) {
        const found = findNodeById(disciple, targetId);
        if (found) return found;
      }
    } else {
      // Single person node (legacy)
      if (node.id === targetId) {
        return node;
      }

      for (const disciple of node.disciples || []) {
        const found = findNodeById(disciple, targetId);
        if (found) return found;
      }
    }

    return null;
  }

  function findPastor(node, root) {
    if (!node) return null;
    
    if (node.pastor && node.pastor.fullName) {
      return node.pastor;
    }
    
    return null;
  }
  
  function findLiderDoce(node, root) {
    if (!node) return null;
    
    if (node.liderDoce && node.liderDoce.fullName) {
      return node.liderDoce;
    }
    
    return null;
  }

  function findLiderCelula(node, root) {
    if (!node || !root) return null;
    
    function searchInTree(currentNode, targetNode, path = []) {
      if (!currentNode) return null;
      
      const isLiderCelula = currentNode.partners 
        ? currentNode.partners.some(p => p.roles?.includes(ROLES.LIDER_CELULA))
        : currentNode.roles?.includes(ROLES.LIDER_CELULA);
      
      if (currentNode.partners) {
        if (currentNode.partners.some(p => p.id === targetNode.partners?.[0]?.id || targetNode.id)) {
          return isLiderCelula ? path : null;
        }
      } else {
        if (currentNode.id === targetNode.id) {
          return isLiderCelula ? path : null;
        }
      }
      
      const disciples = currentNode.disciples || [];
      for (const disciple of disciples) {
        const result = searchInTree(disciple, targetNode, [...path, currentNode]);
        if (result) return result;
      }
      
      return null;
    }
    
    const path = searchInTree(root, node);
    return path && path.length > 0 ? path[0] : null;
  }

  function findLideresCelulaUnderLiderDoce(liderDoceNode) {
    if (!liderDoceNode) return [];
    
    const lideresCelula = [];
    
    function searchInTree(node) {
      if (!node) return;
      
      const isLiderCelula = node.partners 
        ? node.partners.some(p => p.roles?.includes(ROLES.LIDER_CELULA))
        : node.roles?.includes(ROLES.LIDER_CELULA);
      
      if (isLiderCelula) {
        lideresCelula.push(node);
      }
      
      for (const disciple of node.disciples || []) {
        searchInTree(disciple);
      }
    }
    
    searchInTree(liderDoceNode);
    return lideresCelula;
  }

  function findDisciples(node) {
    if (!node) return [];
    return node.disciples || [];
  }

  const userNode = findNodeById(network, userId);
  if (!userNode) return network;

  switch (userRole) {
    case ROLES.PASTOR:
      const pastorNode = findNodeById(network, userId);
      if (pastorNode) {
        return pastorNode;
      }
      return network;
      
    case ROLES.LIDER_DOCE:
      const pastor = findPastor(userNode, network);
      const disciples = findDisciples(userNode);
      
      const customRoot = {
        ...userNode,
        disciples: [
          ...(pastor ? [pastor] : []),
          ...disciples
        ]
      };
      return customRoot;
      
    case ROLES.LIDER_CELULA:
      const pastorLC = findPastor(userNode, network);
      const liderDoceLC = findLiderDoce(userNode, network);
      const disciplesLC = findDisciples(userNode);
      
      const customRootLC = {
        ...userNode,
        pastor: userNode.pastor || null,
        liderDoce: userNode.liderDoce || null,
        liderCelula: null,
        disciples: disciplesLC
      };
      return customRootLC;
      
    case ROLES.DISCIPULO:
      const pastorD = findPastor(userNode, network);
      const liderDoceD = findLiderDoce(userNode, network);
      const liderCelulaD = findLiderCelula(userNode, network);
      
      const customRootD = {
        ...userNode,
        pastor: userNode.pastor || null,
        liderDoce: userNode.liderDoce || null,
        liderCelula: userNode.liderCelula || null,
        disciples: []
      };
      return customRootD;
      
    default:
      return network;
  }
}

export function getRootNodeForRole(network, currentUser) {
  const customHierarchy = buildCustomHierarchy(network, currentUser);
  return customHierarchy || network;
}