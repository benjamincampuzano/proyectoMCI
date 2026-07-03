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

        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        // 1. Invitados con llamada pendiente (creados hace > 1 día, sin llamadas)
        const pendingCallGuestsCount = await prisma.guest.count({
            where: {
                isDeleted: false,
                createdAt: { lte: oneDayAgo },
                calls: { none: {} },
                ...guestNetworkFilter
            }
        });

        // Invitados con visita pendiente (creados hace > 2 días, sin visitas)
        const pendingVisitGuestsCount = await prisma.guest.count({
            where: {
                isDeleted: false,
                createdAt: { lte: twoDaysAgo },
                visits: { none: {} },
                ...guestNetworkFilter
            }
        });

        // Invitados con > 1 mes sin asistir a la iglesia
        const unassistedChurchGuestsCount = await prisma.guest.count({
            where: {
                isDeleted: false,
                OR: [
                    {
                        churchAttendances: { none: {} },
                        createdAt: { lte: thirtyDaysAgo }
                    },
                    {
                        churchAttendances: {
                            some: {},
                            none: { date: { gte: thirtyDaysAgo } }
                        }
                    }
                ],
                ...guestNetworkFilter
            }
        });

        // Invitados con > 1 mes sin asistir a la Celula
        // (Nota: Actualmente los invitados no se registran en CellAttendance directamente)
        const unassistedCellGuestsCount = await prisma.guest.count({
            where: {
                isDeleted: false,
                cellId: { not: null },
                // Como no hay asistencias a célula para invitados, se cuentan todos los asignados 
                // hace más de 30 días o se asume que no han asistido.
                createdAt: { lte: thirtyDaysAgo },
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
            pendingCallGuestsCount,
            pendingVisitGuestsCount,
            unassistedChurchGuestsCount,
            unassistedCellGuestsCount,
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
