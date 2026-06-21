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
    const pushPartner = (p) => {
      const normalized = normalizePartner(p);
      if (!normalized) return;
      partners.push(normalized);
    };

    if (hasPartners(person)) {
      person.partners.forEach((partner) => {
        const normalized = normalizePartner(partner);
        if (!normalized) return;
        visited.add(String(normalized.id));
        pushPartner(normalized);
      });
    }
    else {
      visited.add(String(person.id));
      pushPartner(person);

      const spouseId = spouseMap.get(String(person.id));
      if (spouseId) {
        const spouse = index.get(spouseId);
        if (spouse && !visited.has(String(spouse.id))) {
          visited.add(String(spouse.id));
          pushPartner(spouse);
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

    const collectGuests = (key) => {
      const guests = [
        ...(Array.isArray(person?.[key]) ? person[key] : []),
      ];

      for (const partner of partners) {
        const src = index.get(String(partner.id)) || partner;
        if (Array.isArray(src?.[key])) guests.push(...src[key]);
      }

      return Array.from(new Map(guests.map((guest) => [String(guest.id), guest])).values());
    };

    const assigned = collectGuests('assignedGuests');
    const invited = collectGuests('invitedGuests');

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
