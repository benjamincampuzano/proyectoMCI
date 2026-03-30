const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCouple() {
  try {
    // Buscar a Margarita Mendez
    const margarita = await prisma.user.findFirst({
      where: {
        profile: {
          fullName: {
            contains: 'Margarita Mendez',
            mode: 'insensitive'
          }
        }
      },
      include: {
        profile: true,
        spouse: {
          include: {
            profile: true
          }
        },
        spouseOf: {
          include: {
            profile: true
          }
        },
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    // Buscar a Octavio Silva
    const octavio = await prisma.user.findFirst({
      where: {
        profile: {
          fullName: {
            contains: 'Octavio Silva',
            mode: 'insensitive'
          }
        }
      },
      include: {
        profile: true,
        spouse: {
          include: {
            profile: true
          }
        },
        spouseOf: {
          include: {
            profile: true
          }
        },
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    console.log('=== MARGARITA MENDEZ ===');
    console.log(JSON.stringify(margarita, null, 2));
    
    console.log('\n=== OCTAVIO SILVA ===');
    console.log(JSON.stringify(octavio, null, 2));

    // Verificar si están conectados
    if (margarita && octavio) {
      console.log('\n=== RELACIÓN DE PAREJA ===');
      console.log(`Margarita spouseId: ${margarita.spouseId}`);
      console.log(`Octavio spouseId: ${octavio.spouseId}`);
      console.log(`¿Margarita está casada con Octavio? ${margarita.spouseId === octavio.id}`);
      console.log(`¿Octavio está casado con Margarita? ${octavio.spouseId === margarita.id}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCouple();
