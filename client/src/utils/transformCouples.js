export function buildIdIndex(root) {
  const index = new Map();
  function dfs(node) {
    if (!node || node.id === undefined) return;
    const sId = String(node.id);
    if (index.has(sId)) return;
    index.set(sId, node);
    (node.disciples || []).forEach(dfs);
  }
  dfs(root);
  return index;
}

export function buildCoupleNetwork(root) {
  if (!root) return null;

  // If root already has partners array with proper structure from backend,
  // preserve it and only transform disciples that are individual nodes
  if (Array.isArray(root.partners) && root.partners.length > 0 && root.disciples) {
    // Transform disciples recursively, but preserve nodes that already have partners array
    const transformedDisciples = root.disciples.map(d => {
      // Skip null/undefined disciples
      if (!d) return null;
      // If disciple already has a partners array from backend, preserve it as-is
      if (Array.isArray(d.partners) && d.partners.length > 0) {
        return {
          ...d,
          disciples: d.disciples ? d.disciples.map(child => buildCoupleNetwork(child)).filter(Boolean) : []
        };
      }
      // Otherwise transform individual node to couple format
      return buildCoupleNetwork({
        ...d,
        partners: d.partners || [{ id: d.id, fullName: d.fullName, roles: d.roles || [] }]
      });
    }).filter(Boolean);

    return {
      ...root,
      disciples: transformedDisciples
    };
  }

  const index = buildIdIndex(root);
  const visited = new Set();

  const spouseMap = new Map();
  index.forEach((node, id) => {
    if (node.spouseId) {
      const sId = String(node.spouseId);
      spouseMap.set(String(id), sId);
      spouseMap.set(sId, String(id));
    }
  });

  // Check if node already has partners array from backend
  function hasPartners(node) {
    return Array.isArray(node.partners) && node.partners.length > 0;
  }

  function toCoupleNode(person) {
    if (!person) return null;
    const pId = String(person.id);

    // If this person was already visited as part of a couple, skip
    if (visited.has(pId)) return null;

    const partners = [];
    const pushPartner = (p) => {
      if (!p) return;
      partners.push({ id: p.id, fullName: p.fullName, roles: Array.isArray(p.roles) ? p.roles : [], sex: p.profile?.sex });
    };

    // If backend already sent partners array, use it directly
    if (hasPartners(person)) {
      person.partners.forEach(p => {
        visited.add(String(p.id));
        // Preserve sex from profile if available
        partners.push({
          ...p,
          roles: Array.isArray(p.roles) ? p.roles : [],
          sex: p.sex || p.profile?.sex
        });
      });

      // When backend sends partners array, disciples are already in person.disciples
      // Transform them recursively, preserving partner structure
      const children = person.disciples
        ? person.disciples.map(d => {
            // If disciple already has partners array, preserve it
            if (hasPartners(d)) {
              return toCoupleNode(d);
            }
            // Otherwise build couple from individual
            return buildCoupleNetwork(d);
          }).filter(Boolean)
        : [];

      const assigned = [];
      const invited = [];
      for (const partner of partners) {
        const src = index.get(String(partner.id)) || person;
        if (Array.isArray(src.assignedGuests)) assigned.push(...src.assignedGuests);
        if (Array.isArray(src.invitedGuests)) invited.push(...src.invitedGuests);
      }

      const coupleId = partners.map(p => p.id).sort().join('_');

      return {
        id: coupleId || person.id,
        partners,
        roles: Array.from(new Set(partners.flatMap(p => p.roles))),
        disciples: children,
        guests: { assigned, invited },
        pastor: person.pastor,
        liderDoce: person.liderDoce,
        liderCelula: person.liderCelula,
        pastores: person.pastores,
        lideresDoce: person.lideresDoce,
        lideresCelula: person.lideresCelula,
      };
    }

    // No partners array - need to build couple from spouseId (legacy individual node handling)
    visited.add(pId);
    pushPartner(person);

    const sIdFromMap = spouseMap.get(pId);
    if (sIdFromMap) {
      const spouse = index.get(sIdFromMap);
      if (spouse && !visited.has(String(spouse.id))) {
        visited.add(String(spouse.id));
        pushPartner(spouse);
      }
    }

    partners.sort((a, b) => {
      if (a.sex === b.sex) return 0;
      if (a.sex === 'HOMBRE' && b.sex === 'MUJER') return -1;
      if (a.sex === 'MUJER' && b.sex === 'HOMBRE') return 1;
      if (a.sex && !b.sex) return -1;
      if (!a.sex && b.sex) return 1;
      return 0;
    });

    const roleUnion = Array.from(new Set(partners.flatMap(p => p.roles)));

    const childrenMap = new Map();
    for (const partner of partners) {
      const ds = (index.get(String(partner.id))?.disciples) || [];
      for (const d of ds) {
        if (!partners.some(p => String(p.id) === String(d.id))) {
          childrenMap.set(String(d.id), d);
        }
      }
    }
    const children = Array.from(childrenMap.values()).map(toCoupleNode).filter(Boolean);

    const assigned = [];
    const invited = [];
    for (const partner of partners) {
      const src = index.get(String(partner.id)) || {};
      if (Array.isArray(src.assignedGuests)) assigned.push(...src.assignedGuests);
      if (Array.isArray(src.invitedGuests)) invited.push(...src.invitedGuests);
    }

    const coupleId = partners.map(p => p.id).sort().join('_');

    const result = {
      id: coupleId || person.id,
      partners,
      roles: roleUnion,
      disciples: children,
      guests: { assigned, invited },
      pastor: person.pastor,
      liderDoce: person.liderDoce,
      liderCelula: person.liderCelula,
      pastores: person.pastores,
      lideresDoce: person.lideresDoce,
      lideresCelula: person.lideresCelula,
    };

    return result;
  }

  return toCoupleNode(root);
}

export function computeLevels(root) {
  const levels = [];
  function dfs(node, depth) {
    if (!node) return;
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(node);
    (node.disciples || []).forEach(child => dfs(child, depth + 1));
  }
  dfs(root, 0);
  return levels;
}