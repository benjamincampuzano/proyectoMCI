const { PrismaClient } = require('@prisma/client');
const prisma = require('../utils/database');

const CATEGORY_CONFIG = {
    'KIDS': { label: 'Kids', minAge: 5, maxAge: 7 },
    'TEENS': { label: 'Teens', minAge: 8, maxAge: 10 },
    'ROCAS': { label: 'Rocas', minAge: 11, maxAge: 13 },
    'JOVENES': { label: 'Jóvenes', minAge: 14, maxAge: 99 }
};

const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

const CATEGORY_MODULE_NUMBERS = {
    'KIDS': 101,
    'TEENS': 301,
    'ROCAS': 501,
    'JOVENES': 701
};

const createModule = async (req, res) => {
    try {
        const { name, description, startDate, endDate, professorIds = [], auxiliarIds = [], category = 'KIDS', classCount } = req.body;
        const baseModuleNumber = CATEGORY_MODULE_NUMBERS[category] || 101;

        // Generate unique code by checking existing modules
        let moduleNumber = baseModuleNumber;
        let code = `${category}_${moduleNumber}`;
        
        // Find the next available module number
        while (true) {
            const existingModule = await prisma.seminarModule.findFirst({
                where: { code },
                select: { id: true }
            });
            
            if (!existingModule) {
                break; // Found an available code
            }
            
            moduleNumber++; // Try next number
            code = `${category}_${moduleNumber}`;
        }

        const module = await prisma.seminarModule.create({
            data: {
                name,
                description,
                code,
                type: category,
                ...(classCount && { classCount: parseInt(classCount) }),
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                professorIds: professorIds.length > 0 ? professorIds.map(id => parseInt(id)) : [],
                auxiliaries: auxiliarIds.length > 0 ? {
                    connect: auxiliarIds.map(id => ({ id: parseInt(id) }))
                } : undefined,
                professors: professorIds.length > 0 ? {
                    connect: professorIds.map(id => ({ id: parseInt(id) }))
                } : undefined
            },
            include: {
                professors: { select: { id: true, profile: { select: { fullName: true } } } },
                auxiliaries: { select: { id: true, profile: { select: { fullName: true } } } },
                _count: { select: { enrollments: true } }
            }
        });

        res.json({ ...module, category });
    } catch (error) {
        console.error('Error creating module:', error);
        res.status(500).json({ message: 'Error creating module', error: error.message });
    }
};

const getModules = async (req, res) => {
    try {
        const modules = await prisma.seminarModule.findMany({
            where: {
                type: {
                    in: ['KIDS', 'TEENS', 'ROCAS', 'JOVENES']
                },
                isDeleted: false
            },
            include: {
                professors: { select: { id: true, profile: { select: { fullName: true } } } },
                auxiliaries: { select: { id: true, profile: { select: { fullName: true } } } },
                _count: { select: { enrollments: true } },
                kidsSchedules: {
                    select: {
                        date: true,
                        teacherId: true,
                        teacher: {
                            select: {
                                profile: {
                                    select: { fullName: true }
                                }
                            }
                        }
                    },
                    orderBy: { date: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = modules.map(m => {
            // Calcular fecha de inicio (la más antigua)
            const startDate = m.kidsSchedules.length > 0 
                ? m.kidsSchedules.reduce((earliest, schedule) => {
                    return !earliest || schedule.date < earliest ? schedule.date : earliest;
                }, m.kidsSchedules[0].date)
                : null;

            // Calcular fecha final (la más reciente)
            const endDate = m.kidsSchedules.length > 0
                ? m.kidsSchedules.reduce((latest, schedule) => {
                    return !latest || schedule.date > latest ? schedule.date : latest;
                }, m.kidsSchedules[0].date)
                : null;

            // Calcular último profesor asignado
            const lastTeacher = m.kidsSchedules.length > 0
                ? m.kidsSchedules
                    .filter(schedule => schedule.teacherId)
                    .reduce((latest, schedule) => {
                        return !latest || schedule.date > latest.date ? schedule : latest;
                    }, null)
                : null;

            // Calcular classCount basado en el número de filas del cronograma
            const classCount = m.kidsSchedules.length > 0 ? m.kidsSchedules.length : null;

            return {
                ...m,
                category: m.code?.split('_')[0] || 'KIDS',
                professor: lastTeacher ? { 
                    id: lastTeacher.teacherId, 
                    fullName: lastTeacher.teacher?.profile?.fullName 
                } : m.professors && m.professors.length > 0 ? { 
                    id: m.professors[0].id, 
                    fullName: m.professors[0].profile?.fullName 
                } : null,
                professors: m.professors ? m.professors.map(p => ({ id: p.id, fullName: p.profile?.fullName })) : [],
                startDate,
                endDate,
                classCount, // Usar el cálculo dinámico en lugar del valor original
                auxiliaries: m.auxiliaries.map(a => ({ id: a.id, fullName: a.profile?.fullName }))
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching modules:', error);
        res.status(500).json({ message: 'Error fetching modules' });
    }
};

const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, startDate, endDate, professorIds = [], auxiliarIds = [], classCount } = req.body;

        const module = await prisma.seminarModule.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                classCount: classCount !== undefined ? parseInt(classCount) : undefined,
                professorIds: professorIds.length > 0 ? professorIds.map(id => parseInt(id)) : [],
                auxiliaries: {
                    set: auxiliarIds.map(id => ({ id: parseInt(id) }))
                },
                professors: {
                    set: professorIds.map(id => ({ id: parseInt(id) }))
                }
            },
            include: {
                professors: { select: { id: true, profile: { select: { fullName: true } } } },
                auxiliaries: { select: { id: true, profile: { select: { fullName: true } } } }
            }
        });

        res.json(module);
    } catch (error) {
        console.error('Error updating module:', error);
        res.status(500).json({ message: 'Error updating module' });
    }
};

const deleteModule = async (req, res) => {
    try {
        const { id } = req.params;

        const enrollmentCount = await prisma.seminarEnrollment.count({
            where: { moduleId: parseInt(id) }
        });

        if (enrollmentCount > 0) {
            return res.status(400).json({
                message: 'Cannot delete module with enrolled students'
            });
        }

        await prisma.seminarModule.update({
            where: { id: parseInt(id) },
            data: { isDeleted: true }
        });

        res.json({ message: 'Module deleted successfully' });
    } catch (error) {
        console.error('Error deleting module:', error);
        res.status(500).json({ message: 'Error deleting module' });
    }
};

const getModuleMatrix = async (req, res) => {
    try {
        const { id } = req.params;

        const module = await prisma.seminarModule.findUnique({
            where: { id: parseInt(id) },
            include: {
                kidsSchedules: {
                    select: {
                        date: true,
                        teacherId: true,
                        teacher: {
                            select: {
                                profile: {
                                    select: { fullName: true }
                                }
                            }
                        }
                    },
                    orderBy: { date: 'asc' }
                }
            }
        });

        const enrollments = await prisma.seminarEnrollment.findMany({
            where: { moduleId: parseInt(id) },
            include: {
                user: {
                    select: {
                        id: true,
                        profile: { select: { fullName: true, birthDate: true } },
                        parents: {
                            where: { role: 'DISCIPULO' },
                            include: {
                                parent: {
                                    select: { profile: { select: { fullName: true } } }
                                }
                            }
                        }
                    }
                },
                guardian: {
                    select: { profile: { select: { fullName: true } } }
                },
                classAttendances: true
            }
        });

        const matrix = enrollments.map(e => ({
            enrollmentId: e.id,
            studentId: e.user.id,
            studentName: e.user.profile?.fullName,
            studentBirthDate: e.user.profile?.birthDate,
            responsibleName: e.guardian?.profile?.fullName || e.user.parents?.[0]?.parent?.profile?.fullName || null,
            classAttendances: e.classAttendances,
            finalGrade: e.finalGrade,
            status: e.status
        }));

        res.json({
            module: {
                ...module,
                category: module?.code?.split('_')[0] || 'KIDS',
                classCount: module?.kidsSchedules && module.kidsSchedules.length > 0 ? module.kidsSchedules.length : null
            },
            matrix
        });
    } catch (error) {
        console.error('Error fetching matrix:', error);
        res.status(500).json({ message: 'Error fetching matrix' });
    }
};

const enrollStudent = async (req, res) => {
    try {
        const { userId, moduleId, guardianId } = req.body;

        const existing = await prisma.seminarEnrollment.findUnique({
            where: {
                userId_moduleId: {
                    userId: parseInt(userId),
                    moduleId: parseInt(moduleId)
                }
            }
        });

        if (existing) {
            return res.status(400).json({ message: 'El estudiante ya está inscrito en esta clase' });
        }

        const module = await prisma.seminarModule.findUnique({
            where: { id: parseInt(moduleId) }
        });

        if (!module) {
            return res.status(404).json({ message: 'Clase no encontrada' });
        }

        const category = module.code || 'KIDS';
        const categoryConfig = CATEGORY_CONFIG[category];

        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: { profile: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'Estudiante no encontrado' });
        }

        if (user.profile?.birthDate && categoryConfig) {
            const age = calculateAge(user.profile.birthDate);

            if (age < categoryConfig.minAge || age > categoryConfig.maxAge) {
                return res.status(400).json({
                    message: `Este estudiante tiene ${age} años y no pertenece a la categoría ${categoryConfig.label} (${categoryConfig.minAge}-${categoryConfig.maxAge === 99 ? '∞' : categoryConfig.maxAge} años)`
                });
            }
        }

        const enrollment = await prisma.seminarEnrollment.create({
            data: {
                userId: parseInt(userId),
                moduleId: parseInt(moduleId),
                guardianId: guardianId ? parseInt(guardianId) : null,
                status: 'INSCRITO'
            }
        });

        res.json(enrollment);
    } catch (error) {
        console.error('Error enrolling student:', error);
        res.status(500).json({ message: 'Error enrolling student' });
    }
};

const unenrollStudent = async (req, res) => {
    try {
        const { enrollmentId } = req.params;

        // First delete class attendances associated with the enrollment
        await prisma.classAttendance.deleteMany({
            where: { enrollmentId: parseInt(enrollmentId) }
        });

        // Then delete the enrollment
        await prisma.seminarEnrollment.delete({
            where: { id: parseInt(enrollmentId) }
        });

        res.json({ message: 'Student unenrolled successfully' });
    } catch (error) {
        console.error('Error unenrolling student:', error);
        res.status(500).json({ message: 'Error unenrolling student' });
    }
};

const updateMatrixCell = async (req, res) => {
    try {
        const { enrollmentId, classNumber, status, grade, notes } = req.body;

        const enrollment = await prisma.seminarEnrollment.findUnique({
            where: { id: parseInt(enrollmentId) },
            include: { user: true }
        });

        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        const attendance = await prisma.classAttendance.upsert({
            where: {
                enrollmentId_classNumber: {
                    enrollmentId: parseInt(enrollmentId),
                    classNumber: parseInt(classNumber)
                }
            },
            update: {
                status: status || undefined,
                grade: grade !== undefined ? parseFloat(grade) : undefined,
                notes: notes || undefined
            },
            create: {
                enrollmentId: parseInt(enrollmentId),
                userId: enrollment.userId,
                classNumber: parseInt(classNumber),
                status: status || 'ASISTE',
                grade: grade !== undefined ? parseFloat(grade) : null,
                notes: notes || null
            }
        });

        const allAttendances = await prisma.classAttendance.findMany({
            where: { enrollmentId: parseInt(enrollmentId) }
        });

        const gradesWithValues = allAttendances.filter(a => a.grade !== null).map(a => a.grade);
        if (gradesWithValues.length > 0) {
            const avgGrade = gradesWithValues.reduce((sum, g) => sum + g, 0) / gradesWithValues.length;

            const presentCount = allAttendances.filter(a => a.status === 'ASISTE').length;
            const attendanceRate = allAttendances.length > 0
                ? (presentCount / allAttendances.length) * 100
                : 0;

            await prisma.seminarEnrollment.update({
                where: { id: parseInt(enrollmentId) },
                data: {
                    finalGrade: avgGrade,
                    attendanceRate: attendanceRate,
                    status: 'EN_PROGRESO'
                }
            });
        }

        res.json(attendance);
    } catch (error) {
        console.error('Error updating cell:', error);
        res.status(500).json({ message: 'Error updating cell' });
    }
};

const getStudentMatrix = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                isDeleted: false,
                seminarEnrollments: {
                    some: {
                        module: { 
                            type: {
                                in: ['KIDS', 'TEENS', 'ROCAS', 'JOVENES']
                            }
                        }
                    }
                }
            },
            select: {
                id: true,
                email: true,
                phone: true,
                profile: { 
                    select: { 
                        fullName: true, 
                        birthDate: true 
                    } 
                },
                cellId: true,
                cell: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                cellAttendances: {
                    select: {
                        id: true,
                        date: true,
                        status: true
                    },
                    orderBy: { date: 'desc' },
                    take: 1
                },
                parents: {
                    include: {
                        parent: {
                            select: { id: true, profile: { select: { fullName: true, birthDate: true } } }
                        }
                    }
                },
                seminarEnrollments: {
                    where: {
                        module: { 
                            type: {
                                in: ['KIDS', 'TEENS', 'ROCAS', 'JOVENES']
                            }
                        }
                    },
                    include: {
                        module: { select: { moduleNumber: true, name: true, code: true } },
                        classAttendances: true,
                        guardian: {
                            select: { profile: { select: { fullName: true } } }
                        }
                    }
                }
            }
        });

        const formatted = users.map(u => {
            // Buscar líder (puede ser LIDER_DOCE o LIDER_CELULA)
            const leaderEntry = u.parents?.find(p => p.role === 'LIDER_DOCE' || p.role === 'LIDER_CELULA');
            
            // Buscar acudiente únicamente en las inscripciones (campo guardian)
            const guardianFromEnrollment = u.seminarEnrollments?.find(e => e.guardian)?.guardian;
            
            // Información de célula
            const hasCell = !!u.cellId;
            const lastCellAttendance = u.cellAttendances && u.cellAttendances.length > 0 
                ? u.cellAttendances[0] 
                : null;
            
            return {
                id: u.id,
                email: u.email,
                phone: u.phone,
                fullName: u.profile?.fullName,
                profile: {
                    birthDate: u.profile?.birthDate
                },
                cell: hasCell ? {
                    id: u.cell?.id,
                    name: u.cell?.name,
                    hasCell: true
                } : {
                    hasCell: false
                },
                lastCellAttendance: lastCellAttendance ? {
                    date: lastCellAttendance.date,
                    status: lastCellAttendance.status
                } : null,
                leaderDoce: leaderEntry ? {
                    id: leaderEntry.parent.id,
                    fullName: leaderEntry.parent.profile?.fullName,
                    role: leaderEntry.role
                } : null,
                responsible: guardianFromEnrollment ? {
                    fullName: guardianFromEnrollment.profile?.fullName
                } : null,
                enrollments: u.seminarEnrollments.map(e => ({
                    module: {
                        ...e.module,
                        category: e.module?.code?.split('_')[0] || 'KIDS'
                    },
                    finalGrade: e.finalGrade,
                    attendanceRate: e.classAttendances.length > 0
                        ? (e.classAttendances.filter(a => a.status === 'ASISTE').length / e.classAttendances.length) * 100
                        : 0
                }))
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching student matrix:', error);
        res.status(500).json({ message: 'Error fetching student matrix' });
    }
};

const getEligibleStudents = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { search = '' } = req.query;

        const module = await prisma.seminarModule.findUnique({
            where: { id: parseInt(moduleId) }
        });

        if (!module) {
            return res.status(404).json({ message: 'Clase no encontrada' });
        }

        const category = module.code?.split('_')[0] || 'KIDS';
        const categoryConfig = CATEGORY_CONFIG[category];

        // Get already-enrolled student IDs
        const enrolled = await prisma.seminarEnrollment.findMany({
            where: { moduleId: parseInt(moduleId) },
            select: { userId: true }
        });
        const enrolledIds = enrolled.map(e => e.userId);

        const where = {
            isDeleted: false,
            id: { notIn: enrolledIds.length > 0 ? enrolledIds : [-1] }
        };

        if (search) {
            where.OR = [
                { profile: { fullName: { contains: search, mode: 'insensitive' } } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Filter by age range if category config exists
        if (categoryConfig) {
            const today = new Date();
            const minBirthDate = new Date(today.getFullYear() - categoryConfig.maxAge - 1, today.getMonth(), today.getDate());
            const maxBirthDate = new Date(today.getFullYear() - categoryConfig.minAge, today.getMonth(), today.getDate());

            where.profile = {
                ...where.profile,
                OR: [
                    { birthDate: null },
                    {
                        birthDate: {
                            gte: minBirthDate,
                            lte: maxBirthDate
                        }
                    }
                ]
            };
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                profile: { select: { fullName: true, birthDate: true } }
            },
            take: 20,
            orderBy: { profile: { fullName: 'asc' } }
        });

        const formatted = users.map(u => ({
            id: u.id,
            email: u.email,
            fullName: u.profile?.fullName || 'Sin Nombre',
            birthDate: u.profile?.birthDate || null
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching eligible students:', error);
        res.status(500).json({ message: 'Error fetching eligible students' });
    }
};

const getKidsStatsByLeader = async (req, res) => {
    try {
        const leaders = await prisma.user.findMany({
            where: {
                roles: { 
                    some: { 
                        role: { name: { in: ['LIDER_DOCE', 'LIDER_CELULA'] } } 
                    } 
                },
                isDeleted: false
            },
            select: {
                id: true,
                profile: { select: { fullName: true } },
                roles: {
                    select: {
                        role: { select: { name: true } }
                    }
                },
                children: {
                    where: {
                        child: {
                            seminarEnrollments: {
                                some: {
                                    module: { 
                                        type: {
                                            in: ['KIDS', 'TEENS', 'ROCAS', 'JOVENES']
                                        }
                                    }
                                }
                            },
                            isDeleted: false
                        },
                        role: 'DISCIPULO'
                    },
                    select: {
                        role: true,
                        child: {
                            select: {
                                id: true,
                                seminarEnrollments: {
                                    where: { 
                                        module: { 
                                            type: {
                                                in: ['KIDS', 'TEENS', 'ROCAS', 'JOVENES']
                                            }
                                        }
                                    },
                                    include: { classAttendances: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        const stats = leaders.map(leader => {
            const kids = leader.children.map(c => c.child);
            const totalStudents = kids.length;

            let totalGrades = 0;
            let gradeCount = 0;
            let totalAttendance = 0;
            let attendanceCount = 0;
            let passed = 0;

            kids.forEach(kid => {
                kid.seminarEnrollments.forEach(e => {
                    if (e.finalGrade !== null) {
                        totalGrades += e.finalGrade;
                        gradeCount++;
                    }

                    if (e.classAttendances.length > 0) {
                        const rate = (e.classAttendances.filter(a => a.status === 'ASISTE').length / e.classAttendances.length) * 100;
                        totalAttendance += rate;
                        attendanceCount++;
                    }

                    if (e.finalGrade !== null && e.finalGrade >= 7) {
                        passed++;
                    }
                });
            });

            // Get the role names for display
            const roleNames = leader.roles.map(r => r.role.name).join(', ');
            const roleDisplay = roleNames.includes('LIDER_DOCE') ? 'Líder 12' : 
                              roleNames.includes('LIDER_CELULA') ? 'Líder Célula' : 
                              'Líder';

            return {
                leaderName: `${leader.profile?.fullName || 'Sin nombre'} (${roleDisplay})`,
                students: totalStudents,
                avgGrade: gradeCount > 0 ? (totalGrades / gradeCount).toFixed(1) : '0.0',
                avgAttendance: attendanceCount > 0 ? (totalAttendance / attendanceCount).toFixed(1) : '0.0',
                passed
            };
        }).filter(l => l.students > 0);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching kids stats:', error);
        res.status(500).json({ message: 'Error fetching kids stats' });
    }
};

const checkKidsAccess = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRoles = req.user.roles || [];

        // Admin and Pastor always have access
        if (userRoles.includes('ADMIN') || userRoles.includes('PASTOR')) {
            return res.json({ hasAccess: true });
        }

        // Check if user is coordinator of KIDS module
        const coordinatorRes = await prisma.moduleCoordinator.findFirst({
            where: {
                userId: userId,
                moduleName: {
                    in: ['KIDS', 'kids'] // Buscar ambas variantes
                }
            }
        });

        if (coordinatorRes) {
            return res.json({ hasAccess: true });
        }

        // Check if user has students enrolled in KIDS (as teacher or auxiliary)
        const teacherInSchedules = await prisma.kidsSchedule.findFirst({
            where: {
                OR: [
                    { teacherId: userId },
                    { auxiliaryId: userId }
                ]
            }
        });

        if (teacherInSchedules) {
            return res.json({ hasAccess: true });
        }

        // Check if user has KIDS students in their hierarchy (as leader)
        const hasKidsInHierarchy = await prisma.user.findFirst({
            where: {
                id: userId,
                children: {
                    some: {
                        child: {
                            seminarEnrollments: {
                                some: {
                                    module: {
                                        type: {
                                            in: ['KIDS', 'TEENS', 'ROCAS', 'JOVENES']
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            include: {
                children: {
                    include: {
                        child: {
                            include: {
                                seminarEnrollments: {
                                    where: {
                                        module: {
                                            type: {
                                                in: ['KIDS', 'TEENS', 'ROCAS', 'JOVENES']
                                            }
                                        }
                                    },
                                    include: {
                                        module: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (hasKidsInHierarchy) {
            return res.json({ hasAccess: true });
        }

        res.json({ hasAccess: false });
    } catch (error) {
        console.error('Error checking KIDS access:', error);
        res.status(500).json({ message: 'Error checking KIDS access' });
    }
};

module.exports = {
    createModule,
    getModules,
    updateModule,
    deleteModule,
    getModuleMatrix,
    enrollStudent,
    unenrollStudent,
    updateMatrixCell,
    getStudentMatrix,
    getEligibleStudents,
    getKidsStatsByLeader,
    checkKidsAccess
};
