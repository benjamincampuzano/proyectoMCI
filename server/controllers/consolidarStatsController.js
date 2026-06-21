const { Prisma } = require('../generated/prisma/client');
const prisma = require('../utils/database');
const { getUserNetwork } = require('../utils/networkUtils');

function parseMonthRange(monthValue) {
    const now = new Date();
    let year = now.getFullYear();
    let monthIndex = now.getMonth();

    if (typeof monthValue === 'string' && /^\d{4}-\d{2}$/.test(monthValue)) {
        const [rawYear, rawMonth] = monthValue.split('-').map(Number);
        if (rawMonth >= 1 && rawMonth <= 12) {
            year = rawYear;
            monthIndex = rawMonth - 1;
        }
    }

    const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    const end = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    return { start, end, monthKey };
}

async function getReportScope(req) {
    const roles = req.user?.roles || [];
    const isAdmin = roles.includes('ADMIN');

    if (isAdmin) {
        return {
            isAdmin: true,
            userIds: null,
        };
    }

    const currentUserId = req.user?.id ? Number(req.user.id) : null;
    if (!currentUserId) {
        return {
            isAdmin: false,
            userIds: [],
        };
    }

    const currentUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { spouseId: true },
    });

    const networkIds = await getUserNetwork(currentUserId);
    const spouseId = currentUser?.spouseId ? Number(currentUser.spouseId) : null;
    const spouseNetworkIds = spouseId ? await getUserNetwork(spouseId) : [];
    const userIds = Array.from(
        new Set(
            [
                currentUserId,
                spouseId,
                ...networkIds,
                ...spouseNetworkIds,
            ].filter(Boolean),
        ),
    );

    return {
        isAdmin: false,
        userIds,
    };
}

const getGeneralStats = async (req, res) => {
    try {
        const start = new Date('1970-01-01T00:00:00.000Z');
        const end = new Date('2999-12-31T23:59:59.999Z');
        const scope = await getReportScope(req);
        const scopeIds = scope.userIds;
        const scoped = Array.isArray(scopeIds) && scopeIds.length > 0;

        // 1. GUESTS — ✅ SQL GROUP BY y agregación en PostgreSQL
        const guestRaw = await prisma.$queryRaw`
            WITH guest_base AS (
                SELECT
                    g.id,
                    g.status,
                    COALESCE(up."fullName", 'Sin Asignar') AS leader_name,
                    EXISTS (
                        SELECT 1
                        FROM "GuestCall" gc2
                        WHERE gc2."guestId" = g.id
                    ) AS has_call,
                    EXISTS (
                        SELECT 1
                        FROM "GuestVisit" gv2
                        WHERE gv2."guestId" = g.id
                    ) AS has_visit
                FROM "Guest" g
                JOIN "User" u ON u.id = g."invitedById"
                LEFT JOIN "UserHierarchy" uh ON uh."childId" = u.id AND uh.role IN ('LIDER_DOCE', 'PASTOR', 'LIDER_CELULA')
                LEFT JOIN "UserProfile" up ON up."userId" = uh."parentId"
                WHERE g."createdAt" BETWEEN ${start} AND ${end}
                  AND g."isDeleted" = false
                  ${scoped ? Prisma.sql`AND u.id = ANY(${scopeIds})` : Prisma.empty}
            )
            SELECT
                leader_name,
                COUNT(*)::int AS total_guests,
                COUNT(*) FILTER (WHERE status = 'GANADO')::int AS total_conversions,
                COUNT(*) FILTER (WHERE has_call)::int AS with_call,
                COUNT(*) FILTER (WHERE has_visit)::int AS with_visit
            FROM guest_base
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
        const attendanceRaw = await prisma.$queryRaw`
            SELECT
                TO_CHAR(ca.date, 'YYYY-MM') AS month_key,
                COALESCE(up."fullName", 'Sin Asignar') AS leader_name,
                COUNT(ca.id)::int AS attendance_count
            FROM "ChurchAttendance" ca
            JOIN "User" u ON u.id = ca."userId"
            LEFT JOIN "UserHierarchy" uh ON uh."childId" = u.id AND uh.role = 'LIDER_DOCE'
            LEFT JOIN "UserProfile" up ON up."userId" = uh."parentId"
            WHERE ca.date BETWEEN ${start} AND ${end}
              AND ca.status = 'PRESENTE'
              ${scoped ? Prisma.sql`AND u.id = ANY(${scopeIds})` : Prisma.empty}
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
            ${scoped ? Prisma.sql`WHERE se."userId" = ANY(${scopeIds})` : Prisma.empty}
            GROUP BY sm.id, sm.name
            HAVING COUNT(DISTINCT se.id) > 0
            ORDER BY sm.name
        `;

        const studentStats = moduleRaw.map(m => ({
            moduleName: m.module_name,
            studentCount: Number(m.student_count),
            avgGrade: Number(m.avg_grade),
            avgAttendance: Number(m.avg_attendance)
        }));

        // 4. CELLS — ✅ SQL GROUP BY
        const cellsRaw = await prisma.$queryRaw`
            SELECT
                COALESCE(up."fullName", 'Sin Asignar') AS leader_name,
                COUNT(DISTINCT c.id)::int AS cell_count,
                COALESCE(
                    (SELECT AVG(cnt) FROM (
                        SELECT COUNT(*)::int AS cnt
                        FROM "CellAttendance" ca2
                        WHERE ca2."cellId" = c.id
                          AND ca2.date BETWEEN ${start} AND ${end}
                          AND ca2.status = 'PRESENTE'
                        GROUP BY ca2.date
                    ) sub), 0
                )::float AS avg_attendance,
                COALESCE(
                    json_agg(
                        json_build_object('address', c.address, 'city', c.city, 'lat', c.latitude, 'lng', c.longitude)
                        ORDER BY c.name
                    ) FILTER (WHERE c.address IS NOT NULL),
                    '[]'::json
                ) AS cell_locations
            FROM "Cell" c
            LEFT JOIN "UserHierarchy" uh ON uh."childId" = c."leaderId" AND uh.role = 'LIDER_DOCE'
            LEFT JOIN "UserProfile" up ON up."userId" = uh."parentId"
            WHERE c."isDeleted" = false
              ${scoped ? Prisma.sql`AND c."leaderId" = ANY(${scopeIds})` : Prisma.empty}
            GROUP BY leader_name
            ORDER BY cell_count DESC
        `;

        const cellsByLeader = {};
        for (const row of cellsRaw) {
            const name = row.leader_name || 'Sin Asignar';
            cellsByLeader[name] = {
                count: Number(row.cell_count),
                locations: row.cell_locations || [],
                avgAttendance: Number(row.avg_attendance)
            };
        }

        // 5. ENCUENTROS — ✅ SQL GROUP BY con agregación
        const encuentrosRaw = await prisma.$queryRaw`
            SELECT
                COALESCE(up."fullName", 'Sin Asignar') AS leader_name,
                COUNT(DISTINCT er.id)::int AS reg_count,
                COALESCE(SUM(ep.amount), 0)::float AS total_paid,
                COALESCE(SUM(e.cost), 0)::float AS total_cost
            FROM "EncuentroRegistration" er
            JOIN "Encuentro" e ON e.id = er."encuentroId"
            LEFT JOIN "Guest" g ON g.id = er."guestId"
            LEFT JOIN "User" u ON u.id = COALESCE(er."userId", g."assignedToId")
            LEFT JOIN "UserHierarchy" uh ON uh."childId" = COALESCE(er."userId", g."assignedToId")
            LEFT JOIN "UserProfile" up ON up."userId" = uh."parentId"
            LEFT JOIN "EncuentroPayment" ep ON ep."registrationId" = er.id
            WHERE er.status != 'CANCELLED'
              AND e."startDate" >= ${start}
              ${scoped ? Prisma.sql`AND COALESCE(er."userId", g."assignedToId") = ANY(${scopeIds})` : Prisma.empty}
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
            st.totalCost += Number(row.total_cost);
            st.totalPaid += Number(row.total_paid);
            st.balance = st.totalCost - st.totalPaid;
        }

        // 6. CONVENTIONS — ✅ SQL GROUP BY con agregación
        const conventionsRaw = await prisma.$queryRaw`
            SELECT
                COALESCE(up."fullName", 'Sin Asignar') AS leader_name,
                COUNT(DISTINCT cr.id)::int AS reg_count,
                COALESCE(SUM(cp.amount), 0)::float AS total_paid,
                COALESCE(SUM(conv.cost), 0)::float AS total_cost
            FROM "ConventionRegistration" cr
            JOIN "Convention" conv ON conv.id = cr."conventionId"
            LEFT JOIN "User" u ON u.id = cr."userId"
            LEFT JOIN "UserHierarchy" uh ON uh."childId" = cr."userId"
            LEFT JOIN "UserProfile" up ON up."userId" = uh."parentId"
            LEFT JOIN "ConventionPayment" cp ON cp."registrationId" = cr.id
            WHERE cr.status != 'CANCELLED'
              AND conv."startDate" >= ${start}
              ${scoped ? Prisma.sql`AND cr."userId" = ANY(${scopeIds})` : Prisma.empty}
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
            st.totalCost += Number(row.total_cost);
            st.totalPaid += Number(row.total_paid);
            st.balance = st.totalCost - st.totalPaid;
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
                conversionRate: totalGuests > 0 ? ((totalConversions / totalGuests) * 100) : 0,
                totalCells: Object.values(cellsByLeader).reduce((acc, c) => acc + c.count, 0),
                totalMembers: await prisma.user.count({
                    where: {
                        isDeleted: false,
                        ...(scoped ? { id: { in: scopeIds } } : {}),
                        roles: {
                            none: {
                                role: { name: 'ADMIN' }
                            }
                        }
                    }
                }),
                activeStudents: await prisma.seminarEnrollment.count({
                    where: {
                        status: 'EN_PROGRESO',
                        ...(scoped ? { userId: { in: scopeIds } } : {}),
                    }
                }),
                graduatedInPeriod: 0
            }
        });
    } catch (error) {
        console.error('Error fetching general consolidated stats:', error);
        res.status(500).json({ error: 'Error fetching general statistics: ' + error.message });
    }
};

const getChurchAttendanceLeadersStats = async (req, res) => {
    try {
        const { month } = req.query;
        const { start, end, monthKey } = parseMonthRange(month);
        const scope = await getReportScope(req);
        const scopeIds = scope.userIds;
        const scoped = Array.isArray(scopeIds) && scopeIds.length > 0;

        const rawRows = await prisma.$queryRaw`
            SELECT
                uh."parentId" AS leader_id,
                COALESCE(up."fullName", 'Sin Asignar') AS leader_name,
                COUNT(*)::int AS total_records,
                COUNT(*) FILTER (WHERE ca.status = 'PRESENTE')::int AS present_count,
                COUNT(*) FILTER (WHERE ca.status = 'AUSENTE')::int AS absent_count,
                COUNT(*) FILTER (WHERE ca.status = 'VIRTUAL')::int AS virtual_count
            FROM "ChurchAttendance" ca
            JOIN "User" u ON u.id = ca."userId"
            JOIN "UserHierarchy" uh ON uh."childId" = u.id AND uh.role = 'LIDER_DOCE'
            LEFT JOIN "UserProfile" up ON up."userId" = uh."parentId"
            WHERE ca.date >= ${start}
              AND ca.date < ${end}
              AND ca.status IN ('PRESENTE', 'AUSENTE', 'VIRTUAL')
              ${scoped ? Prisma.sql`AND u.id = ANY(${scopeIds})` : Prisma.empty}
              AND NOT EXISTS (
                  SELECT 1
                  FROM "UserRole" ur
                  JOIN "Role" r ON r.id = ur."roleId"
                  WHERE ur."userId" = u.id
                    AND r.name = 'ADMIN'
              )
            GROUP BY uh."parentId", up."fullName"
            ORDER BY present_count DESC, total_records DESC, leader_name ASC
        `;

        const leaders = rawRows.map((row) => {
            const present = Number(row.present_count);
            const absent = Number(row.absent_count);
            const virtual = Number(row.virtual_count);
            const total = Number(row.total_records);

            return {
                leaderId: row.leader_id,
                leaderName: row.leader_name,
                present,
                absent,
                virtual,
                total,
                attendanceRate: total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0,
            };
        });

        const rankings = {
            present: [...leaders]
                .sort((a, b) => b.present - a.present || b.total - a.total || a.leaderName.localeCompare(b.leaderName)),
            absent: [...leaders]
                .sort((a, b) => b.absent - a.absent || b.total - a.total || a.leaderName.localeCompare(b.leaderName)),
            virtual: [...leaders]
                .sort((a, b) => b.virtual - a.virtual || b.total - a.total || a.leaderName.localeCompare(b.leaderName)),
        };

        const summary = leaders.reduce((acc, row) => {
            acc.totalPresent += row.present;
            acc.totalAbsent += row.absent;
            acc.totalVirtual += row.virtual;
            acc.totalRecords += row.total;
            return acc;
        }, {
            totalPresent: 0,
            totalAbsent: 0,
            totalVirtual: 0,
            totalRecords: 0,
        });

        res.json({
            period: { month: monthKey, start, end },
            leaders,
            rankings,
            summary,
        });
    } catch (error) {
        console.error('Error fetching church attendance leaders stats:', error);
        res.status(500).json({ error: 'Error fetching church attendance leaders statistics: ' + error.message });
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
            LEFT JOIN "UserHierarchy" uh ON uh."childId" = se."userId"
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
            avgGrade: Number(s.avg_grade),
            avgAttendance: Number(s.avg_attendance_pct),
            passed: Number(s.passed_count)
        })));
    } catch (error) {
        console.error('Error fetching seminar stats by leader:', error);
        res.status(500).json({ error: 'Error fetching seminar statistics: ' + error.message });
    }
};

module.exports = { getGeneralStats, getChurchAttendanceLeadersStats, getSeminarStatsByLeader };
