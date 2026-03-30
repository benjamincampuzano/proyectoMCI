const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCoupleRelation() {
  try {
    // Actualizar a Margarita para que su spouseId apunte a Octavio
    const updatedMargarita = await prisma.user.update({
      where: { id: 325 }, // ID de Margarita
      data: { spouseId: 323 } // ID de Octavio
    });

    console.log('=== RELACIÓN CORREGIDA ===');
    console.log('Margarita Mendez ahora tiene spouseId:', updatedMargarita.spouseId);
    
    // Verificar la relación
    const margarita = await prisma.user.findUnique({
      where: { id: 325 },
      include: {
        profile: true,
        spouse: {
          include: {
            profile: true
          }
        }
      }
    });

    console.log('Nombre del esposo:', margarita.spouse?.profile?.fullName);
    console.log('¿Relación bidireccional?:', margarita.spouseId === margarita.spouse?.id);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCoupleRelation();
