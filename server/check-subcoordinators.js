const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSubCoordinators() {
  try {
    console.log('VERIFICANDO SUBCOORDINADORES...\n');

    const subCoordinators = await prisma.moduleSubCoordinator.findMany({
      include: {
        user: {
          select: {
            email: true,
            profile: { select: { fullName: true } }
          }
        }
      }
    });

    console.log(`Total subcoordinadores: ${subCoordinators.length}\n`);

    if (subCoordinators.length > 0) {
      subCoordinators.forEach(sc => {
        console.log(`Módulo: ${sc.moduleName}`);
        console.log(`  Usuario: ${sc.user.profile?.fullName || 'Sin Nombre'} (${sc.user.email})`);
        console.log('');
      });
    } else {
      console.log('No hay subcoordinadores asignados\n');
    }

    console.log('VERIFICANDO TESOREROS...\n');

    const treasurers = await prisma.moduleTreasurer.findMany({
      include: {
        user: {
          select: {
            email: true,
            profile: { select: { fullName: true } }
          }
        }
      }
    });

    console.log(`Total tesoreros: ${treasurers.length}\n`);

    if (treasurers.length > 0) {
      treasurers.forEach(t => {
        console.log(`Módulo: ${t.moduleName}`);
        console.log(`  Usuario: ${t.user.profile?.fullName || 'Sin Nombre'} (${t.user.email})`);
        console.log('');
      });
    } else {
      console.log('No hay tesoreros asignados\n');
    }

    // Verificar duplicados
    console.log('VERIFICANDO DUPLICADOS...\n');

    const subCoordByModule = {};
    subCoordinators.forEach(sc => {
      if (!subCoordByModule[sc.moduleName]) {
        subCoordByModule[sc.moduleName] = [];
      }
      subCoordByModule[sc.moduleName].push(sc);
    });

    const treasurerByModule = {};
    treasurers.forEach(t => {
      if (!treasurerByModule[t.moduleName]) {
        treasurerByModule[t.moduleName] = [];
      }
      treasurerByModule[t.moduleName].push(t);
    });

    let hasDuplicates = false;

    for (const moduleName in subCoordByModule) {
      if (subCoordByModule[moduleName].length > 1) {
        console.log(`⚠️  Subcoordinadores duplicados en módulo "${moduleName}": ${subCoordByModule[moduleName].length} registros`);
        hasDuplicates = true;
      }
    }

    for (const moduleName in treasurerByModule) {
      if (treasurerByModule[moduleName].length > 1) {
        console.log(`⚠️  Tesoreros duplicados en módulo "${moduleName}": ${treasurerByModule[moduleName].length} registros`);
        hasDuplicates = true;
      }
    }

    if (!hasDuplicates) {
      console.log('✓ No se encontraron duplicados en subcoordinadores ni tesoreros');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubCoordinators();
