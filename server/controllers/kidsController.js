const { PrismaClient } = require('@prisma/client');
const prisma = require('../prisma/client');

const CATEGORY_CONFIG = {
    'KIDS': { label: 'Kids', minAge: 5, maxAge: 10 },
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
    'ROCAS': 301,
    'JOVENES': 501
};

const createModule = async (req, res) => {
    try {
        const { name, description, startDate, endDate, professorId, auxiliarIds = [], category = 'KIDS' } = req.body;
        const moduleNumber = CATEGORY_MODULE_NUMBERS[category] || 101;

        const module = await prisma.seminarModule.create({
            data: {
                name,
                description,
                type: 'KIDS',
                code: `${category}_${Date.now()}`,
                moduleNumber,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                professorId: professorId ? parseInt(professorId) : null,
                auxiliaries: auxiliarIds.length > 0 ? {
                    connect: auxiliarIds.map(id => ({ id: parseInt(id) }))
                } : undefined
            },
            include: {
                professor: { select: { id: true, profile: { select: { fullName: true } } } },
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
                type: 'KIDS',
                isDeleted: false
            },
            include: {
                professor: { select: { id: true, profile: { select: { fullName: true } } } },
                auxiliaries: { select: { id: true, profile: { select: { fullName: true } } } },
                _count: { select: { enrollments: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = modules.map(m => ({
            ...m,
            category: m.code?.split('_')[0] || 'KIDS',
            professor: m.professor ? { id: m.professor.id, fullName: m.professor.profile?.fullName } : null,
            auxiliaries: m.auxiliaries.map(a => ({ id: a.id, fullName: a.profile?.fullName }))
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching modules:', error);
        res.status(500).json({ message: 'Error fetching modules' });
    }
};

const updateModule = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, startDate, endDate, professorId, auxiliarIds = [] } = req.body;

        const module = await prisma.seminarModule.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                professorId: professorId ? parseInt(professorId) : null,
                auxiliaries: {
                    set: auxiliarIds.map(id => ({ id: parseInt(id) }))
                }
            },
            include: {
                professor: { select: { id: true, profile: { select: { fullName: true } } } },
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
            where: { id: parseInt(id) }
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
                classAttendances: true
            }
        });

        const matrix = enrollments.map(e => ({
            enrollmentId: e.id,
            studentId: e.user.id,
            studentName: e.user.profile?.fullName,
            studentBirthDate: e.user.profile?.birthDate,
            responsibleName: e.user.parents?.[0]?.parent?.profile?.fullName || null,
            classAttendances: e.classAttendances,
            finalGrade: e.finalGrade,
            status: e.status
        }));

        res.json({
            module: {
                ...module,
                category: module?.code?.split('_')[0] || 'KIDS'
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
        const { userId, moduleId } = req.body;

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
                profile: { network: { in: ['KIDS', 'ROCAS', 'JOVENES'] } },
                isDeleted: false
            },
            select: {
                id: true,
                profile: { select: { fullName: true } },
                parents: {
                    include: {
                        parent: {
                            select: { id: true, profile: { select: { fullName: true } } }
                        }
                    }
                },
                seminarEnrollments: {
                    where: {
                        module: { type: 'KIDS' }
                    },
                    include: {
                        module: { select: { moduleNumber: true, name: true, code: true } },
                        classAttendances: true
                    }
                }
            }
        });

        const formatted = users.map(u => {
            const leaderEntry = u.parents?.find(p => p.role === 'LIDER_DOCE');
            const responsibleEntry = u.parents?.find(p => p.role === 'DISCIPULO');

            return {
                id: u.id,
                fullName: u.profile?.fullName,
                leaderDoce: leaderEntry ? {
                    id: leaderEntry.parent.id,
                    fullName: leaderEntry.parent.profile?.fullName
                } : null,
                responsible: responsibleEntry ? {
                    fullName: responsibleEntry.parent.profile?.fullName
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
                roles: { some: { role: { name: 'LIDER_DOCE' } } },
                isDeleted: false
            },
            select: {
                id: true,
                profile: { select: { fullName: true } },
                children: {
                    where: {
                        child: {
                            profile: { network: 'KIDS' },
                            isDeleted: false
                        },
                        role: 'LIDER_DOCE'
                    },
                    select: {
                        child: {
                            select: {
                                id: true,
                                seminarEnrollments: {
                                    where: { module: { type: 'KIDS' } },
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

            return {
                leaderName: leader.profile?.fullName || 'Sin nombre',
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
    getKidsStatsByLeader
};
