const prisma = require('../utils/database');
const { getUserNetwork } = require('../utils/networkUtils');

const getPendingTasks = async (req, res) => {
    try {
        const isLiderDoce = req.user.roles.includes('LIDER_DOCE');
        const isAdmin = req.user.roles.includes('ADMIN');

        // Solo visible para LIDER_DOCE (y ADMIN por gestión)
        if (!isLiderDoce && !isAdmin) {
            return res.json({
                uncontactedGuestsCount: 0,
                unassignedDisciplesCount: 0,
                unassistedChurchCount: 0,
                unassistedCellCount: 0,
                unfinishedModulesCount: 0
            });
        }

        let networkIds = [];
        if (isLiderDoce && !isAdmin) {
            const descendants = await getUserNetwork(req.user.id);
            networkIds = [req.user.id, ...descendants];
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Filtro base para usuarios (discípulos en la red)
        const userNetworkFilter = networkIds.length > 0 ? { id: { in: networkIds } } : {};
        
        // Filtro base para invitados (invitados en la red)
        const guestNetworkFilter = networkIds.length > 0 ? {
            OR: [
                { invitedById: { in: networkIds } },
                { assignedToId: { in: networkIds } },
                { cell: { liderDoceId: req.user.id } },
                { cell: { leaderId: { in: networkIds } } }
            ]
        } : {};

        // 1. Invitados que no se han contactado (0 llamadas y 0 Visitas)
        const uncontactedGuestsCount = await prisma.guest.count({
            where: {
                status: 'NUEVO',
                called: false,
                visited: false,
                isDeleted: false,
                ...guestNetworkFilter
            }
        });

        // 2. Discipulos que no tienen asignado una celula
        const unassignedDisciplesCount = await prisma.user.count({
            where: {
                isActive: true,
                isDeleted: false,
                cellId: null,
                roles: {
                    some: {
                        role: {
                            name: 'DISCIPULO'
                        }
                    }
                },
                ...userNetworkFilter
            }
        });

        // 3. Discipulos que tienen mas de un mes sin asistir a la iglesia
        const unassistedChurchCount = await prisma.user.count({
            where: {
                isActive: true,
                isDeleted: false,
                roles: { some: { role: { name: 'DISCIPULO' } } },
                churchAttendances: {
                    none: {
                        date: {
                            gte: thirtyDaysAgo
                        }
                    }
                },
                ...userNetworkFilter
            }
        });

        // 4. Discipulos que tienen mas de un mes sin asistir a la celula
        const unassistedCellCount = await prisma.user.count({
            where: {
                isActive: true,
                isDeleted: false,
                cellId: { not: null },
                roles: { some: { role: { name: 'DISCIPULO' } } },
                cellAttendances: {
                    none: {
                        date: {
                            gte: thirtyDaysAgo
                        }
                    }
                },
                ...userNetworkFilter
            }
        });

        // 5. Discipulos que no han terminado los modulos o clases de Discipular
        const unfinishedModulesCount = await prisma.user.count({
            where: {
                isActive: true,
                isDeleted: false,
                roles: { some: { role: { name: 'DISCIPULO' } } },
                seminarEnrollments: {
                    some: {
                        status: {
                            not: 'COMPLETADO'
                        }
                    }
                },
                ...userNetworkFilter
            }
        });

        res.json({
            uncontactedGuestsCount,
            unassignedDisciplesCount,
            unassistedChurchCount,
            unassistedCellCount,
            unfinishedModulesCount
        });
    } catch (error) {
        console.error('Error fetching pending tasks:', error);
        res.status(500).json({ error: 'Error fetching pending tasks' });
    }
};

module.exports = {
    getPendingTasks
};
