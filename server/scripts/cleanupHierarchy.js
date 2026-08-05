const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = require('../utils/database');

const ROLE_RANK = { PASTOR: 3, LIDER_DOCE: 2, LIDER_CELULA: 1, DISCIPULO: 0 };
const LEADER_ROLES = ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'];

const shouldApply = process.argv.includes('--apply');

const formatIds = ids => (ids.length > 0 ? ids.slice(0, 20).join(', ') + (ids.length > 20 ? ` (+${ids.length - 20} más)` : '') : '-');

const findChildrenWithSpouses = async (tx) => {
    const children = await tx.user.findMany({
        where: { spouseId: { not: null } },
        select: { id: true, spouseId: true },
    });
    return new Map(children.map(c => [c.id, c.spouseId]));
};

const findRolesByUser = async (tx, userIds) => {
    const roles = await tx.userRole.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, role: { select: { name: true } } },
    });
    const map = new Map();
    roles.forEach(r => {
        if (!map.has(r.userId)) map.set(r.userId, []);
        map.get(r.userId).push(r.role.name);
    });
    return map;
};

const findUsersByIds = async (tx, userIds) => {
    const users = await tx.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, isDeleted: true },
    });
    return new Map(users.map(u => [u.id, u]));
};

const cleanupHierarchy = async () => {
    const stats = {
        selfLoops: [],
        spouseAsLeader: [],
        roleIncoherent: [],
        duplicates: [],
        cyclesDeleted: [],
        cyclesKept: [],
        orphans: [],
        cellsReview: [],
    };

    try {
        await prisma.$transaction(async (tx) => {
            const all = await tx.userHierarchy.findMany({ select: { id: true, parentId: true, childId: true, role: true } });
            const childSpouse = await findChildrenWithSpouses(tx);
            const allUserIds = [...new Set(all.flatMap(h => [h.parentId, h.childId]))];
            const rolesByUser = await findRolesByUser(tx, allUserIds);
            const usersById = await findUsersByIds(tx, allUserIds);

            // 1) Self-loops
            for (const h of all) {
                if (h.parentId === h.childId) stats.selfLoops.push(h.id);
            }

            // 2) Spouse as leader (the leader is the child's own spouse)
            for (const h of all) {
                if (childSpouse.get(h.childId) === h.parentId) stats.spouseAsLeader.push(h.id);
            }

            // 3) Role incoherence for leadership roles
            for (const h of all) {
                if (!LEADER_ROLES.includes(h.role)) continue;
                if (stats.selfLoops.includes(h.id) || stats.spouseAsLeader.includes(h.id)) continue;
                const parent = usersById.get(h.parentId);
                if (!parent) continue;
                const parentRoles = rolesByUser.get(h.parentId) || [];
                const parentSpouseId = childSpouse.get(h.parentId);
                const spouseRoles = parentSpouseId ? (rolesByUser.get(parentSpouseId) || []) : [];
                const hasRole = parentRoles.includes(h.role) || spouseRoles.includes(h.role);
                if (!hasRole) stats.roleIncoherent.push(h.id);
            }

            // 4) Orphan rows (parent missing or deleted)
            for (const h of all) {
                const parent = usersById.get(h.parentId);
                if (!parent || parent.isDeleted) stats.orphans.push(h.id);
            }

            // 5) Exact duplicates of (parentId, childId, role) - keep the lowest id
            const dupGroups = new Map();
            for (const h of all) {
                const key = `${h.parentId}-${h.childId}-${h.role}`;
                if (!dupGroups.has(key)) dupGroups.set(key, []);
                dupGroups.get(key).push(h.id);
            }
            for (const ids of dupGroups.values()) {
                if (ids.length < 2) continue;
                ids.sort((a, b) => a - b);
                stats.duplicates.push(...ids.slice(1));
            }

            // 6) Cycles (symmetric parent/child pairs)
            const byChild = new Map();
            all.forEach(h => {
                if (!byChild.has(h.childId)) byChild.set(h.childId, []);
                byChild.get(h.childId).push(h);
            });
            const visitedPairs = new Set();
            for (const h of all) {
                const pairKey = `${Math.min(h.parentId, h.childId)}-${Math.max(h.parentId, h.childId)}`;
                if (visitedPairs.has(pairKey)) continue;
                visitedPairs.add(pairKey);

                // Reverse direction row: B -> A for an A -> B hierarchy row
                const reverse = (byChild.get(h.parentId) || []).find(r => r.parentId === h.childId);
                if (!reverse) continue;

                const parentRank = (id) => Math.max(0, ...((rolesByUser.get(id) || []).map(r => ROLE_RANK[r] ?? 0)));
                const aDiff = parentRank(h.parentId) - parentRank(h.childId);
                const bDiff = parentRank(reverse.parentId) - parentRank(reverse.childId);

                let toKeep, toDelete;
                if (aDiff !== bDiff) {
                    // Keep the row flowing from the higher-ranked parent
                    toKeep = aDiff > bDiff ? h : reverse;
                    toDelete = aDiff > bDiff ? reverse : h;
                } else {
                    // Tie: keep the row with the lower parentId, delete the rest
                    toKeep = h.parentId < reverse.parentId ? h : reverse;
                    toDelete = h.parentId < reverse.parentId ? reverse : h;
                }

                stats.cyclesKept.push(toKeep.id);
                stats.cyclesDeleted.push(toDelete.id);
            }

            const deleteIds = [
                ...stats.selfLoops,
                ...stats.spouseAsLeader,
                ...stats.roleIncoherent,
                ...stats.duplicates,
                ...stats.cyclesDeleted,
                ...stats.orphans,
            ];
            const uniqueDeleteIds = [...new Set(deleteIds)];

            if (uniqueDeleteIds.length > 0) {
                if (shouldApply) {
                    const result = await tx.userHierarchy.deleteMany({ where: { id: { in: uniqueDeleteIds } } });
                    console.log(`\nSe eliminaron ${result.count} filas de UserHierarchy.`);
                } else {
                    console.log(`\n[DRY RUN] Se eliminarían ${uniqueDeleteIds.length} filas de UserHierarchy (usa --apply para ejecutar).`);
                }
            }

            // 7) Report: cells with leader == host or leader == liderDoce (review, no auto-delete)
            const cells = await tx.cell.findMany({
                select: { id: true, name: true, leaderId: true, hostId: true, liderDoceId: true },
            });
            cells.forEach(c => {
                const flags = [];
                if (c.leaderId === c.hostId) flags.push('leader==host');
                if (c.leaderId === c.liderDoceId) flags.push('leader==liderDoce');
                if (flags.length > 0) stats.cellsReview.push({ id: c.id, name: c.name, flags: flags.join(' | ') });
            });
        });

        console.log('\n===== REPORTE DE LIMPIEZA DE JERARQUIA =====');
        console.log(`Self-loops (parentId == childId):        ${stats.selfLoops.length}`);
        console.log(`  ids: ${formatIds(stats.selfLoops)}`);
        console.log(`Conyuge como lider:                       ${stats.spouseAsLeader.length}`);
        console.log(`  ids: ${formatIds(stats.spouseAsLeader)}`);
        console.log(`Rol incoherente (lider sin el rol):       ${stats.roleIncoherent.length}`);
        console.log(`  ids: ${formatIds(stats.roleIncoherent)}`);
        console.log(`Duplicados exactos (parentId-childId-rol): ${stats.duplicates.length}`);
        console.log(`  ids: ${formatIds(stats.duplicates)}`);
        console.log(`Huérfanas (padre inexistente/eliminado):  ${stats.orphans.length}`);
        console.log(`  ids: ${formatIds(stats.orphans)}`);
        console.log(`Ciclos simétricos (filas a eliminar):     ${stats.cyclesDeleted.length}`);
        console.log(`  ids: ${formatIds(stats.cyclesDeleted)}`);
        console.log(`Ciclos simétricos (filas a conservar):    ${stats.cyclesKept.length}`);
        console.log(`  ids: ${formatIds(stats.cyclesKept)}`);
        console.log(`\nCélulas para revisión (NO se tocan):       ${stats.cellsReview.length}`);
        stats.cellsReview.slice(0, 40).forEach(c => console.log(`  - ${c.name} [${c.flags}]`));
        console.log('\n=============================================');

        return stats;
    } catch (error) {
        console.error('Error en cleanupHierarchy:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
};

if (require.main === module) {
    cleanupHierarchy()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { cleanupHierarchy };
