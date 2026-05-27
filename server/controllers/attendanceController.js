const prisma = require('../utils/database');

const selfReport = async (req, res) => {
  try {
    const { type, date, attended } = req.body;
    const userId = parseInt(req.user.id);

    if (!type || !date || attended === undefined || attended === null) {
      return res.status(400).json({ error: 'type, date, and attended are required' });
    }

    if (!['church', 'cell'].includes(type)) {
      return res.status(400).json({ error: 'type must be "church" or "cell"' });
    }

    const status = attended ? 'PRESENTE' : 'AUSENTE';
    const parsedDate = new Date(date);

    if (type === 'church') {
      await prisma.churchAttendance.upsert({
        where: {
          date_userId: {
            date: parsedDate,
            userId,
          },
        },
        update: { status },
        create: {
          date: parsedDate,
          userId,
          status,
        },
      });
    } else {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { cellId: true },
      });

      if (!user || !user.cellId) {
        return res.status(400).json({
          error: 'No tienes una célula asignada por el momento y debes de comunicarte con tu líder para que te asigne a una.',
        });
      }

      await prisma.cellAttendance.upsert({
        where: {
          date_cellId_userId: {
            date: parsedDate,
            cellId: user.cellId,
            userId,
          },
        },
        update: { status },
        create: {
          date: parsedDate,
          cellId: user.cellId,
          userId,
          status,
        },
      });
    }

    res.json({ message: 'Asistencia registrada exitosamente' });
  } catch (error) {
    console.error('Error in selfReport:', error);
    res.status(500).json({ error: 'Error al registrar asistencia' });
  }
};

module.exports = { selfReport };
