const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==========================================
// ROLES INTERNOS
// ==========================================

exports.assignRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    // Validar role enum
    if (!['COORDINADOR', 'TESORERO', 'PROFESOR', 'ESTUDIANTE'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const artRole = await prisma.artSchoolRole.upsert({
      where: {
        userId_role: { userId: Number(userId), role }
      },
      update: {},
      create: {
        userId: Number(userId),
        role
      }
    });

    res.status(200).json({ message: 'Rol asignado', artRole });
  } catch (error) {
    res.status(500).json({ error: 'Error al asignar rol' });
  }
};

exports.removeRole = async (req, res) => {
  try {
    const { userId, role } = req.params;

    await prisma.artSchoolRole.delete({
      where: {
        userId_role: { userId: Number(userId), role }
      }
    });

    res.status(200).json({ message: 'Rol removido' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'El usuario no tiene ese rol' });
    }
    res.status(500).json({ error: 'Error al remover rol' });
  }
};

exports.getUserRoles = async (req, res) => {
  try {
    const { userId } = req.params;
    const roles = await prisma.artSchoolRole.findMany({
      where: { userId: Number(userId) }
    });
    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener roles' });
  }
};

// ==========================================
// CLASES
// ==========================================

exports.createClass = async (req, res) => {
  try {
    const { name, description, cost, startDate, endDate, professorId } = req.body;

    const newClass = await prisma.artClass.create({
      data: {
        name,
        description,
        cost: Number(cost) || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        professorId: professorId ? Number(professorId) : null,
      }
    });

    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la clase' });
  }
};

exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, cost, startDate, endDate, professorId, isDeleted } = req.body;

    const updatedClass = await prisma.artClass.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        cost: cost !== undefined ? Number(cost) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        professorId: professorId ? Number(professorId) : null,
        isDeleted
      }
    });

    res.status(200).json(updatedClass);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la clase' });
  }
};

exports.getClasses = async (req, res) => {
  try {
    const classes = await prisma.artClass.findMany({
      where: { isDeleted: false },
      include: {
        professor: {
          select: { id: true, profile: { select: { fullName: true } } }
        },
        _count: {
          select: { enrollments: true }
        }
      }
    });
    res.status(200).json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las clases' });
  }
};

exports.getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const artClass = await prisma.artClass.findUnique({
      where: { id: Number(id) },
      include: {
        professor: {
          select: { id: true, profile: { select: { fullName: true } } }
        },
        enrollments: {
          include: {
            user: { select: { id: true, profile: { select: { fullName: true } } } }
          }
        }
      }
    });

    if (!artClass) return res.status(404).json({ error: 'Clase no encontrada' });

    res.status(200).json(artClass);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la clase' });
  }
};

// ==========================================
// INSCRIPCIONES
// ==========================================

exports.enrollStudent = async (req, res) => {
  try {
    const { userId, classId } = req.body;

    const enrollment = await prisma.artEnrollment.create({
      data: {
        userId: Number(userId),
        classId: Number(classId),
        status: 'INSCRITO'
      },
      include: {
        user: { select: { id: true, profile: { select: { fullName: true } } } }
      }
    });

    res.status(201).json(enrollment);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El usuario ya está inscrito en esta clase' });
    }
    res.status(500).json({ error: 'Error al inscribir estudiante' });
  }
};

exports.updateEnrollmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const enrollment = await prisma.artEnrollment.update({
      where: { id: Number(id) },
      data: { status }
    });

    res.status(200).json(enrollment);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar inscripción' });
  }
};

exports.getEnrollmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const enrollment = await prisma.artEnrollment.findUnique({
            where: { id: Number(id) },
            include: {
                user: { select: { id: true, profile: { select: { fullName: true } } } },
                artClass: true,
                attendances: true,
                payments: true
            }
        });

        if (!enrollment) return res.status(404).json({ error: 'Inscripción no encontrada' });

        res.status(200).json(enrollment);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener inscripción' });
    }
}

// ==========================================
// ASISTENCIAS
// ==========================================

exports.registerAttendance = async (req, res) => {
  try {
    const { enrollmentId, classNumber, attended, date } = req.body;

    if (classNumber < 1 || classNumber > 8) {
      return res.status(400).json({ error: 'El número de clase debe estar entre 1 y 8' });
    }

    const attendance = await prisma.artAttendance.upsert({
      where: {
        enrollmentId_classNumber: {
          enrollmentId: Number(enrollmentId),
          classNumber: Number(classNumber)
        }
      },
      update: {
        attended,
        date: date ? new Date(date) : new Date()
      },
      create: {
        enrollmentId: Number(enrollmentId),
        classNumber: Number(classNumber),
        attended,
        date: date ? new Date(date) : new Date()
      }
    });

    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar asistencia' });
  }
};

// ==========================================
// PAGOS
// ==========================================

exports.registerPayment = async (req, res) => {
  try {
    const { enrollmentId, amount, notes, date } = req.body;
    const registeredById = req.user.id; // Asumiendo que req.user lo pone el authMiddleware

    const payment = await prisma.artPayment.create({
      data: {
        enrollmentId: Number(enrollmentId),
        amount: Number(amount),
        notes,
        date: date ? new Date(date) : new Date(),
        registeredById
      }
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar pago' });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.artPayment.delete({
      where: { id: Number(id) }
    });

    res.status(200).json({ message: 'Pago eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar pago' });
  }
};
