import { ROLES } from '../../constants/roles';

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

  // Función auxiliar para encontrar un nodo por ID en toda la red
  function findNodeById(node, targetId) {
    if (!node) return null;
    
    
    if (node.partners) {
     if (node.partners.some(p => p.id === targetId)) {
        return node;
      }
      
      for (const disciple of node.disciples || []) {
        const found = findNodeById(disciple, targetId);
        if (found) return found;
      }
    } else {
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

  // Función auxiliar para encontrar el pastor de un nodo
  function findPastor(node, root) {
    if (!node) return null;
    
    // Usar directamente los datos del nodo transformado
    if (node.pastor && node.pastor.fullName) {
      return node.pastor;
    }
    
    return null;
  }
  
  // Función auxiliar para encontrar el líder de doce de un nodo
  function findLiderDoce(node, root) {
    if (!node) return null;
    
    // Usar directamente los datos del nodo transformado
    if (node.liderDoce && node.liderDoce.fullName) {
      return node.liderDoce;
    }
    
    return null;
  }

  // Función auxiliar para encontrar el líder de célula de un nodo
  function findLiderCelula(node, root) {
    if (!node || !root) return null;
    
    function searchInTree(currentNode, targetNode, path = []) {
      if (!currentNode) return null;
      
      // Verificar si el nodo actual es un LIDER_CELULA
      const isLiderCelula = currentNode.partners 
        ? currentNode.partners.some(p => p.roles?.includes(ROLES.LIDER_CELULA))
        : currentNode.roles?.includes(ROLES.LIDER_CELULA);
      
      // Si encontramos el nodo objetivo y el actual es LIDER_CELULA, retornar
      if (currentNode.partners) {
        if (currentNode.partners.some(p => p.id === targetNode.partners?.[0]?.id || targetNode.id)) {
          return isLiderCelula ? path : null;
        }
      } else {
        if (currentNode.id === targetNode.id) {
          return isLiderCelula ? path : null;
        }
      }
      
      // Buscar en los discípulos
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

  // Función para encontrar todos los líderes de célula bajo un líder de doce
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
      
      // Continuar buscando en los discípulos
      for (const disciple of node.disciples || []) {
        searchInTree(disciple);
      }
    }
    
    searchInTree(liderDoceNode);
    return lideresCelula;
  }

  // Función para encontrar todos los discípulos de un nodo
  function findDisciples(node) {
    if (!node) return [];
    return node.disciples || [];
  }

  // Encontrar el nodo del usuario actual
  const userNode = findNodeById(network, userId);
  if (!userNode) return network; // Retornar red completa si no se encuentra el usuario

  // Construir jerarquía según el rol
  switch (userRole) {
    case ROLES.PASTOR:
      // Si es PASTOR, mostrar la red completa con él como raíz
      // Buscar el nodo del pastor en la red y usarlo como raíz
      const pastorNode = findNodeById(network, userId);
      if (pastorNode) {
        return pastorNode;
      }
      return network;
      
    case ROLES.LIDER_DOCE:
      // Si es LIDER_DOCE, aparecerían su PASTOR -> Mismo Usuario -> Todos sus discípulos (incluyendo LÍDERES DE CÉLULA) -> Invitados
      const pastor = findPastor(userNode, network);
      const disciples = findDisciples(userNode);
      
      // Crear un nodo raíz personalizado
      const customRoot = {
        ...userNode,
        disciples: [
          ...(pastor ? [pastor] : []),
          ...disciples
        ]
      };
      return customRoot;
      
    case ROLES.LIDER_CELULA:
      // Si es LIDER_CELULA: SU PASTOR -> Su LIDER_DOCE -> Mismo Usuario -> Sus discípulos -> Invitados
      const pastorLC = findPastor(userNode, network);
      const liderDoceLC = findLiderDoce(userNode, network);
      const disciplesLC = findDisciples(userNode);
      
      // Crear un nodo raíz que incluya los líderes superiores
      const customRootLC = {
        ...userNode,
        // Asignar los líderes superiores directamente
        pastor: userNode.pastor || null,
        liderDoce: userNode.liderDoce || null,
        liderCelula: null, // El usuario actual es LIDER_CELULA
        // Mantener los discípulos originales
        disciples: disciplesLC
      };
      return customRootLC;
      
    case ROLES.DISCIPULO:
      // Si es DISCIPULO: Su PASTOR -> su LIDER_DOCE -> Su LIDER_CELULA -> Mismo Usuario -> Invitados
      const pastorD = findPastor(userNode, network);
      const liderDoceD = findLiderDoce(userNode, network);
      const liderCelulaD = findLiderCelula(userNode, network);
      
            // Crear un nodo raíz que incluya los líderes superiores
      const customRootD = {
        ...userNode,
        // Asignar los líderes superiores directamente
        pastor: userNode.pastor || null,
        liderDoce: userNode.liderDoce || null,
        liderCelula: userNode.liderCelula || null,
        // Los discípulos no tienen discípulos (solo invitados)
        disciples: []
      };
      return customRootD;
      
    default:
      // Para otros roles o sin rol, mostrar la red completa
      return network;
  }
}

/**
 * Obtiene el nodo raíz apropiado según el rol del usuario
 * @param {Object} network - La red completa
 * @param {Object} currentUser - El usuario actual
 * @returns {Object} - El nodo raíz para mostrar
 */
export function getRootNodeForRole(network, currentUser) {
  const customHierarchy = buildCustomHierarchy(network, currentUser);
  return customHierarchy || network;
}
