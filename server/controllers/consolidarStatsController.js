const { Prisma } = require('@prisma/client');
const prisma = require('../utils/database');
const { getUserNetwork } = require('../utils/networkUtils');

const getGeneralStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const userRoles = req.user.roles || [];
        const currentUserId = req.user.id ? parseInt(req.user.id) : null;

        let networkIds = [];
        const isAdmin = userRoles.includes('ADMIN');
        const isCoordinator = userRoles.includes('COORDINADOR');
        const isModuleCoordinator = req.user.isModuleCoordinator || false;
        const isLeader = userRoles.some(r => ['LIDER_DOCE', 'PASTOR', 'LIDER_CELULA'].includes(r));

        if (isLeader && currentUserId && !isAdmin && !isCoordinator && !isModuleCoordinator) {
            networkIds = await getUserNetwork(currentUserId);
            networkIds.push(currentUserId);
        }

        const end = endDate ? new Date(endDate) : new Date();
        if (endDate) end.setUTCHours(23, 59, 59, 999);

        const start = startDate ? new Date(startDate) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
        if (startDate) start.setUTCHours(0, 0, 0, 0);

        // 1. GUESTS — ✅ SQL GROUP BY y agregación en PostgreSQL
        const networkFilterGuests = networkIds.length > 0
            ? Prisma.sql`AND u.id = ANY(${networkIds})`
            : Prisma.empty;

        const guestRaw = await prisma.$queryRaw`
            SELECT
                up."fullName" AS leader_name,
                COUNT(g.id)::int AS total_guests,
                COUNT(CASE WHEN g.status = 'GANADO' THEN 1 END)::int AS total_conversions,
                COUNT(CASE WHEN gc.id IS NOT NULL THEN 1 END)::int AS with_call,
                COUNT(CASE WHEN gv.id IS NOT NULL THEN 1 END)::int AS with_visit
            FROM "Guest" g
            JOIN "User" u ON u.id = g."invitedById"
            JOIN "UserHierarchy" uh ON uh."childId" = u.id AND uh.role IN ('LIDER_DOCE', 'PASTOR', 'LIDER_CELULA')
            JOIN "UserProfile" up ON up."userId" = uh."parentId"
            LEFT JOIN "GuestCall" gc ON gc."guestId" = g.id
            LEFT JOIN "GuestVisit" gv ON gv."guestId" = g.id
            WHERE g."createdAt" BETWEEN ${start} AND ${end}
              AND g."isDeleted" = false
              ${networkFilterGuests}
            GROUP BY leader_name
            ORDER BY total_guests DESC
        `;

        const guestsByLeader = {};
        let totalGuests = 0;
        let totalConversions = 0;
        const trackingStats = { withCall: 0, withoutCall: 0, withVisit: 0, withoutVisit: 0 };

        for (const row of guestRaw) {
            const name = row.leader_name || 'Sin Asignar';
            const gCount = Number(row.total_guests);
            guestsByLeader[name] = (guestsByLeader[name] || 0) + gCount;
            totalGuests += gCount;
            const conv = Number(row.total_conversions);
            totalConversions += conv;
            trackingStats.withCall += Number(row.with_call);
            trackingStats.withoutCall += gCount - Number(row.with_call);
            trackingStats.withVisit += Number(row.with_visit);
            trackingStats.withoutVisit += gCount - Number(row.with_visit);
        }

        // 2. CHURCH ATTENDANCE — ✅ Usar SQL GROUP BY en lugar de cargar todos los registros
        // La query original traía cada asistencia con user+roles+parents anidados (muy costoso).
        // Ahora delegamos la agrupación a PostgreSQL directamente.
        const networkFilter_sql = networkIds.length > 0
            ? Prisma.sql`AND u.id = ANY(${networkIds})`
            : Prisma.empty;

        const attendanceRaw = await prisma.$queryRaw`
            SELECT
                TO_CHAR(ca.date, 'YYYY-MM') AS month_key,
                up."fullName" AS leader_name,
                COUNT(ca.id)::int AS attendance_count
            FROM "ChurchAttendance" ca
            JOIN "User" u ON u.id = ca."userId"
            JOIN "UserHierarchy" uh ON uh."childId" = u.id AND uh.role = 'LIDER_DOCE'
            JOIN "UserProfile" up ON up."userId" = uh."parentId"
            WHERE ca.date BETWEEN ${start} AND ${end}
              AND ca.status = 'PRESENTE'
              ${networkFilter_sql}
            GROUP BY month_key, leader_name
            ORDER BY month_key ASC
        `;

        const attendanceByMonth = {};
        for (const row of attendanceRaw) {
            const mk = row.month_key;
            if (!attendanceByMonth[mk]) attendanceByMonth[mk] = {};
            attendanceByMonth[mk][row.leader_name] = (attendanceByMonth[mk][row.leader_name] || 0) + Number(row.attendance_count);
        }


        // 3. STUDENTS — ✅ Agregación con SQL
        const moduleRaw = await prisma.$queryRaw`
            SELECT
                sm.id,
                sm.name AS module_name,
                COUNT(DISTINCT se.id)::int AS student_count,
                COALESCE(AVG(se."finalGrade"), 0)::float AS avg_grade,
                COALESCE(
                    AVG(
                        CASE WHEN ca.id IS NOT NULL
                            THEN CASE WHEN ca.status = 'ASISTE' THEN 1.0 ELSE 0.0 END
                            ELSE NULL
                        END
                    ) * 100, 0
                )::float AS avg_attendance
            FROM "SeminarModule" sm
            LEFT JOIN "SeminarEnrollment" se ON se."moduleId" = sm.id
                AND se."createdAt" BETWEEN ${start} AND ${end}
            LEFT JOIN "ClassAttendance" ca ON ca."enrollmentId" = se.id
            GROUP BY sm.id, sm.name
            HAVING COUNT(DISTINCT se.id) > 0
            ORDER BY sm.name
        `;

        const studentStats = moduleRaw.map(m => ({
            moduleName: m.module_name,
            studentCount: Number(m.student_count),
            avgGrade: Number(m.avg_grade).toFixed(1),
            avgAttendance: Number(m.avg_attendance).toFixed(1)
        }));

        // 4. CELLS — ✅ SQL GROUP BY
        const cellsRaw = await prisma.$queryRaw`
            SELECT
                up."fullName" AS leader_name,
                COUNT(DISTINCT c.id)::int AS cell_count,
                AVG(
                    COALESCE(
                        (SELECT COUNT(*) FROM "CellAttendance" ca2
                         WHERE ca2."cellId" = c.id
                           AND ca2.date BETWEEN ${start} AND ${end}
                           AND ca2.status = 'PRESENTE'
                         GROUP BY ca2.date), 0
                    )
                )::float AS avg_attendance
            FROM "Cell" c
            JOIN "UserHierarchy" uh ON uh."childId" = c."leaderId" AND uh.role = 'LIDER_DOCE'
            JOIN "UserProfile" up ON up."userId" = uh."parentId"
            WHERE c."isDeleted" = false
              ${networkFilterGuests}
            GROUP BY leader_name
            ORDER BY cell_count DESC
        `;

        const cellsByLeader = {};
        for (const row of cellsRaw) {
            const name = row.leader_name || 'Sin Asignar';
            cellsByLeader[name] = {
                count: Number(row.cell_count),
                locations: [],
                avgAttendance: Number(row.avg_attendance).toFixed(1)
            };
        }

        // 5. ENCUENTROS — ✅ SQL GROUP BY con agregación
        const encuentrosRaw = await prisma.$queryRaw`
            SELECT
                COALESCE(up."fullName", 'Sin Asignar') AS leader_name,
                COUNT(DISTINCT er.id)::int AS reg_count,
                COALESCE(SUM(ep.amount), 0)::float AS total_paid
            FROM "EncuentroRegistration" er
            JOIN "Encuentro" e ON e.id = er."encuentroId"
            LEFT JOIN "User" u ON u.id = COALESCE(er."userId", g."assignedToId")
            LEFT JOIN "Guest" g ON g.id = er."guestId"
            LEFT JOIN "UserHierarchy" uh ON uh."childId" = COALESCE(er."userId", g."assignedToId")
                AND uh.role = 'LIDER_DOCE'
            LEFT JOIN "UserProfile" up ON up."userId" = uh."parentId"
            LEFT JOIN "EncuentroPayment" ep ON ep."registrationId" = er.id
            WHERE er.status != 'CANCELLED'
              AND e."startDate" >= ${start}
              ${isAdmin ? Prisma.empty : Prisma.sql`AND (
                  g."invitedById" = ANY(${networkIds})
                  OR g."assignedToId" = ANY(${networkIds})
                  OR er."userId" = ANY(${networkIds})
              )`}
            GROUP BY leader_name
            ORDER BY reg_count DESC
        `;

        const encuentrosInfo = {};
        for (const row of encuentrosRaw) {
            const name = row.leader_name;
            if (!encuentrosInfo[name]) {
                encuentrosInfo[name] = { 'Sin Célula': { count: 0, totalCost: 0, totalPaid: 0, balance: 0 } };
            }
            const st = encuentrosInfo[name]['Sin Célula'];
            st.count += Number(row.reg_count);
            st.totalPaid += Number(row.total_paid);
        }

        // 6. CONVENTIONS — ✅ SQL GROUP BY con agregación
        const conventionsRaw = await prisma.$queryRaw`
            SELECT
                COALESCE(up."fullName", 'Sin Asignar') AS leader_name,
                COUNT(DISTINCT cr.id)::int AS reg_count,
                COALESCE(SUM(cp.amount), 0)::float AS total_paid
            FROM "ConventionRegistration" cr
            JOIN "Convention" conv ON conv.id = cr."conventionId"
            LEFT JOIN "User" u ON u.id = cr."userId"
            LEFT JOIN "UserHierarchy" uh ON uh."childId" = cr."userId"
                AND uh.role = 'LIDER_DOCE'
            LEFT JOIN "UserProfile" up ON up."userId" = uh."parentId"
            LEFT JOIN "ConventionPayment" cp ON cp."registrationId" = cr.id
            WHERE cr.status != 'CANCELLED'
              AND conv."startDate" >= ${start}
              ${isAdmin ? Prisma.empty : Prisma.sql`AND (
                  cr."userId" = ANY(${networkIds})
                  OR cr."registeredById" = ANY(${networkIds})
              )`}
            GROUP BY leader_name
            ORDER BY reg_count DESC
        `;

        const conventionsInfo = {};
        for (const row of conventionsRaw) {
            const name = row.leader_name;
            if (!conventionsInfo[name]) {
                conventionsInfo[name] = { count: 0, totalCost: 0, totalPaid: 0, balance: 0 };
            }
            const st = conventionsInfo[name];
            st.count += Number(row.reg_count);
            st.totalPaid += Number(row.total_paid);
        }

        // Limpiar helpers que ya no se usan
        // getLiderName y hierarchyInclude se eliminaron — la lógica está en SQL

        res.json({
            period: { start, end },
            guestsByLeader,
            attendanceByMonth,
            studentStats,
            cellsByLeader,
            encuentrosInfo,
            conventionsInfo,
            trackingStats,
            summary: {
                totalGuests,
                totalConversions,
                conversionRate: totalGuests > 0 ? ((totalConversions / totalGuests) * 100).toFixed(1) : 0,
                totalCells: Object.values(cellsByLeader).reduce((acc, c) => acc + c.count, 0),
                totalMembers: await prisma.user.count({
                    where: {
                        isDeleted: false,
                        roles: {
                            none: {
                                role: { name: 'ADMIN' }
                            }
                        }
                    }
                }),
                activeStudents: await prisma.seminarEnrollment.count({ where: { status: 'EN_PROGRESO' } }),
                graduatedInPeriod: 0
            }
        });
    } catch (error) {
        console.error('Error fetching general consolidated stats:', error);
        res.status(500).json({ error: 'Error fetching general statistics: ' + error.message });
    }
};

const getSeminarStatsByLeader = async (req, res) => {
    try {
        const userRoles = req.user.roles || [];
        const currentUserId = req.user.id ? parseInt(req.user.id) : null;
        let networkIds = [];
        const isAdmin = userRoles.includes('ADMIN');
        const isCoordinator = userRoles.includes('COORDINADOR');
        const isModuleCoordinator = req.user.isModuleCoordinator || false;
        const isLeader = userRoles.some(r => ['LIDER_DOCE', 'PASTOR', 'LIDER_CELULA'].includes(r));
        if (isLeader && currentUserId && !isAdmin && !isCoordinator && !isModuleCoordinator) {
            networkIds = await getUserNetwork(currentUserId);
            networkIds.push(currentUserId);
        }

        // ✅ SQL GROUP BY directo en vez de cargar todas las inscripciones + classAttendances
        const userFilter = (isAdmin || isCoordinator || isModuleCoordinator)
            ? Prisma.empty
            : Prisma.sql`AND se."userId" = ANY(${networkIds})`;

        const statsRaw = await prisma.$queryRaw`
            SELECT
                COALESCE(up."fullName", 'Sin Asignar') AS leader_name,
                COUNT(DISTINCT se.id)::int AS total_students,
                COALESCE(AVG(se."finalGrade"), 0)::float AS avg_grade,
                COUNT(se.id) FILTER (WHERE se."finalGrade" >= 70)::int AS passed_count,
                COALESCE(
                    AVG(
                        CASE WHEN ca.status = 'ASISTE' THEN 1.0
                             WHEN ca.status IS NOT NULL THEN 0.0
                             ELSE NULL END
                    ) * 100, 0
                )::float AS avg_attendance_pct
            FROM "SeminarEnrollment" se
            JOIN "User" u ON u.id = se."userId"
            LEFT JOIN "UserHierarchy" uh ON uh."childId" = se."userId" AND uh.role = 'LIDER_DOCE'
            LEFT JOIN "UserProfile" up ON up."userId" = uh."parentId"
            LEFT JOIN "ClassAttendance" ca ON ca."enrollmentId" = se.id
            WHERE 1=1
              ${userFilter}
            GROUP BY leader_name
            ORDER BY total_students DESC
        `;

        res.json(statsRaw.map(s => ({
            leaderName: s.leader_name,
            students: Number(s.total_students),
            avgGrade: Number(s.avg_grade).toFixed(1),
            avgAttendance: Number(s.avg_attendance_pct).toFixed(1),
            passed: Number(s.passed_count)
        })));
    } catch (error) {
        console.error('Error fetching seminar stats by leader:', error);
        res.status(500).json({ error: 'Error fetching seminar statistics: ' + error.message });
    }
};

module.exports = { getGeneralStats, getSeminarStatsByLeader };
