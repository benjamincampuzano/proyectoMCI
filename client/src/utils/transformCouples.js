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

  function hasPartners(node) {
    return Array.isArray(node.partners) && node.partners.length > 0;
  }

  function normalizePartner(partner) {
    if (!partner) return null;
    return {
      ...partner,
      roles: Array.isArray(partner.roles) ? partner.roles : [],
      sex: partner.sex || partner.profile?.sex,
    };
  }

  function toCoupleNode(person) {
    if (!person) return null;

    const partnerIds = hasPartners(person)
      ? person.partners.map((partner) => String(partner.id))
      : [String(person.id)];
    const nodeId = partnerIds.slice().sort().join('_');

    if (partnerIds.some((id) => visited.has(id))) return null;

    const partners = [];
    const partnerSources = new Map();
    const pushPartner = (p, source = person) => {
      const normalized = normalizePartner(p);
      if (!normalized) return;
      partners.push(normalized);
      partnerSources.set(String(normalized.id), source);
    };

    if (hasPartners(person)) {
      person.partners.forEach((partner) => {
        const normalized = normalizePartner(partner);
        if (!normalized) return;
        visited.add(String(normalized.id));
        pushPartner(normalized, index.get(String(normalized.id)) || person);
      });
    }
    else {
      visited.add(String(person.id));
      pushPartner(person, index.get(String(person.id)) || person);

      const spouseId = spouseMap.get(String(person.id));
      if (spouseId) {
        const spouse = index.get(spouseId);
        if (spouse && !visited.has(String(spouse.id))) {
          visited.add(String(spouse.id));
          pushPartner(spouse, spouse);
        }
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

    const children = (person.disciples || [])
      .map(child => toCoupleNode(child))
      .filter(Boolean);

    const assigned = [];
    const invited = [];
    for (const partner of partners) {
      const src = partnerSources.get(String(partner.id)) || index.get(String(partner.id)) || person;
      if (Array.isArray(src.assignedGuests)) assigned.push(...src.assignedGuests);
      if (Array.isArray(src.invitedGuests)) invited.push(...src.invitedGuests);
    }

    const result = {
      id: nodeId || person.id,
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
