const prisma = require('./utils/database');

async function updateGuest() {
  try {
    // Buscar el invitado por nombre primero
    const guest = await prisma.guest.findFirst({
      where: { name: 'Benjamin Campuzano' }
    });
    
    if (!guest) {
      return;
    }
    
    // Actualizar el invitado existente para asignarlo a Cesar y Monica (ID: 4)
    const updated = await prisma.guest.update({
      where: { id: guest.id },
      data: { assignedToId: 4 },
      include: {
        assignedTo: { select: { profile: { select: { fullName: true } } } }
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateGuest();
