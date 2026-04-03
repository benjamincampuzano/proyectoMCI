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
        coordinatorId: req.body.coordinatorId ? Number(req.body.coordinatorId) : null,
        duration: req.body.duration ? Number(req.body.duration) : 60,
        schedule: req.body.schedule || ''
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
        professorId: professorId !== undefined ? (professorId ? Number(professorId) : null) : undefined,
        coordinatorId: req.body.coordinatorId !== undefined ? (req.body.coordinatorId ? Number(req.body.coordinatorId) : null) : undefined,
        duration: req.body.duration !== undefined ? Number(req.body.duration) : undefined,
        schedule: req.body.schedule !== undefined ? req.body.schedule : undefined,
        isDeleted
      }
    });

    res.status(200).json(updatedClass);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la clase' });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if class has enrollments
    const classWithEnrollments = await prisma.artClass.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: { enrollments: true }
        }
      }
    });

    if (!classWithEnrollments) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }

    if (classWithEnrollments._count.enrollments > 0) {
      return res.status(400).json({ 
        error: `No se puede eliminar la clase porque tiene ${classWithEnrollments._count.enrollments} estudiante(s) inscrito(s)` 
      });
    }

    // Soft delete the class
    await prisma.artClass.update({
      where: { id: Number(id) },
      data: { isDeleted: true }
    });

    res.status(200).json({ message: 'Clase eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ error: 'Error al eliminar la clase' });
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
        coordinator: {
          select: { id: true, profile: { select: { fullName: true } } }
        },
        enrollments: {
          include: {
            payments: true
          }
        },
        _count: {
          select: { enrollments: true }
        }
      }
    });

    // Add totals to enrollments in each class
    const classesWithTotals = classes.map(cls => ({
      ...cls,
      enrollments: (cls.enrollments || []).map(enr => {
        const totalPaid = enr.payments.reduce((sum, p) => sum + p.amount, 0);
        return {
          ...enr,
          totalPaid,
          balance: enr.finalCost - totalPaid
        };
      })
    }));

    res.status(200).json(classesWithTotals);
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
        coordinator: {
          select: { id: true, profile: { select: { fullName: true } } }
        },
        enrollments: {
          include: {
            user: { select: { id: true, profile: { select: { fullName: true } } } },
            guest: { select: { id: true, name: true, phone: true } },
            payments: true
          }
        }
      }
    });

    if (!artClass) return res.status(404).json({ error: 'Clase no encontrada' });

    // Calculate totals for each enrollment
    const enrollmentsWithTotals = artClass.enrollments.map(enr => {
      const totalPaid = enr.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = enr.finalCost - totalPaid;
      return {
        ...enr,
        totalPaid,
        balance
      };
    });

    res.status(200).json({
      ...artClass,
      enrollments: enrollmentsWithTotals
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la clase' });
  }
};

// ==========================================
// INSCRIPCIONES
// ==========================================

exports.enrollStudent = async (req, res) => {
  try {
    const { userId, guestId, discountPercentage = 0 } = req.body;
    const { id: classId } = req.params; // Obtener classId de los parámetros de ruta

    // Validar que se proporcione userId o guestId, pero no ambos
    if (!userId && !guestId) {
      return res.status(400).json({ error: 'Debe proporcionar userId o guestId' });
    }
    if (userId && guestId) {
      return res.status(400).json({ error: 'No puede proporcionar userId y guestId simultáneamente' });
    }

    // Si no viene classId de params, buscarlo en body (para compatibilidad con ruta antigua)
    const finalClassId = classId || req.body.classId;

    if (!finalClassId) {
      return res.status(400).json({ error: 'Debe proporcionar classId' });
    }

    // Obtener información de la clase para calcular costos
    const artClass = await prisma.artClass.findUnique({
      where: { id: Number(finalClassId) }
    });

    if (!artClass) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }

    // Calcular costo final con descuento
    const discount = Math.max(0, Math.min(100, Number(discountPercentage) || 0));
    const finalCost = artClass.cost * (1 - discount / 100);

    // Crear inscripción
    const enrollmentData = {
      classId: Number(finalClassId),
      discountPercentage: discount,
      finalCost: finalCost,
      status: 'INSCRITO'
    };

    // Agregar userId o guestId según corresponda
    if (userId) {
      enrollmentData.userId = Number(userId);
    } else {
      enrollmentData.guestId = Number(guestId);
    }

    const enrollment = await prisma.artEnrollment.create({
      data: enrollmentData,
      include: {
        user: { select: { id: true, profile: { select: { fullName: true } } } },
        guest: { select: { id: true, name: true, phone: true } },
        artClass: { select: { id: true, name: true, cost: true } }
      }
    });

    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Error en enrollStudent:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El usuario/invitado ya está inscrito en esta clase' });
    }
    res.status(500).json({ error: 'Error al crear inscripción' });
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

exports.deleteEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.artEnrollment.delete({
      where: { id: Number(id) }
    });

    res.status(200).json({ message: 'Inscripción eliminada correctamente' });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({ error: 'Error al eliminar la inscripción' });
  }
};

exports.getEnrollmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const enrollment = await prisma.artEnrollment.findUnique({
            where: { id: Number(id) },
            include: {
                user: { select: { id: true, profile: { select: { fullName: true } } } },
                guest: { select: { id: true, name: true, phone: true } },
                artClass: true,
                attendances: true,
                payments: true
            }
        });

        if (!enrollment) return res.status(404).json({ error: 'Inscripción no encontrada' });

        const totalPaid = enrollment.payments.reduce((sum, p) => sum + p.amount, 0);
        const balance = enrollment.finalCost - totalPaid;

        res.status(200).json({
            ...enrollment,
            totalPaid,
            balance
        });
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
    const { id } = req.params;
    const { enrollmentId, amount, notes, date } = req.body;
    const registeredById = req.user.id;

    const finalEnrollmentId = id ? Number(id) : Number(enrollmentId);

    if (!finalEnrollmentId) {
      return res.status(400).json({ error: 'La inscripción es requerida' });
    }

    const payment = await prisma.artPayment.create({
      data: {
        enrollmentId: finalEnrollmentId,
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
