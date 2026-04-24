const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSubCoordinators() {
  try {
    console.log('Iniciando corrección de subcoordinadores y tesorores...\n');

    // 1. Normalizar nombres de módulos
    console.log('1. Normalizando nombres de módulos...');
    
    const allSubCoordinators = await prisma.moduleSubCoordinator.findMany();
    const allTreasurers = await prisma.moduleTreasurer.findMany();
    
    for (const record of allSubCoordinators) {
      let normalizedName = record.moduleName.toLowerCase().trim().replace(/\s+/g, '-');
      
      if (normalizedName === 'encuentros' || normalizedName === 'encuentro') {
        normalizedName = 'encuentro';
      }
      
      if (normalizedName !== record.moduleName) {
        await prisma.moduleSubCoordinator.update({
          where: { id: record.id },
          data: { moduleName: normalizedName }
        });
        console.log(`  Subcoordinador: "${record.moduleName}" -> "${normalizedName}"`);
      }
    }

    for (const record of allTreasurers) {
      let normalizedName = record.moduleName.toLowerCase().trim().replace(/\s+/g, '-');
      
      if (normalizedName === 'encuentros' || normalizedName === 'encuentro') {
        normalizedName = 'encuentro';
      }
      
      if (normalizedName !== record.moduleName) {
        await prisma.moduleTreasurer.update({
          where: { id: record.id },
          data: { moduleName: normalizedName }
        });
        console.log(`  Tesorero: "${record.moduleName}" -> "${normalizedName}"`);
      }
    }

    console.log('  ✓ Nombres normalizados\n');

    // 2. Eliminar duplicados de subcoordinadores
    console.log('2. Eliminando duplicados de subcoordinadores...');
    
    const usersWithSubCoordinations = await prisma.user.findMany({
      where: {
        isDeleted: false,
        moduleSubCoordinations: {
          some: {}
        }
      },
      select: {
        id: true,
        email: true,
        profile: { select: { fullName: true } },
        moduleSubCoordinations: {
          select: { id: true, moduleName: true }
        }
      }
    });

    for (const user of usersWithSubCoordinations) {
      const modules = user.moduleSubCoordinations;
      const moduleNames = modules.map(m => m.moduleName);
      
      const uniqueModules = [...new Set(moduleNames)];
      
      if (moduleNames.length > uniqueModules.length) {
        console.log(`  Usuario: ${user.profile?.fullName} (${user.email})`);
        console.log(`    Módulos actuales: ${moduleNames.join(', ')}`);
        console.log(`    Módulos únicos: ${uniqueModules.join(', ')}`);
        
        for (const moduleName of uniqueModules) {
          const moduleRecords = modules.filter(m => m.moduleName === moduleName);
          if (moduleRecords.length > 1) {
            moduleRecords.sort((a, b) => b.id - a.id);
            const toDelete = moduleRecords.slice(1);
            for (const record of toDelete) {
              await prisma.moduleSubCoordinator.delete({
                where: { id: record.id }
              });
              console.log(`    Eliminado duplicado ID: ${record.id} para módulo: ${moduleName}`);
            }
          }
        }
      }
    }

    console.log('  ✓ Duplicados de subcoordinadores eliminados\n');

    // 3. Eliminar duplicados de tesoreros
    console.log('3. Eliminando duplicados de tesoreros...');
    
    const usersWithTreasuries = await prisma.user.findMany({
      where: {
        isDeleted: false,
        moduleTreasurers: {
          some: {}
        }
      },
      select: {
        id: true,
        email: true,
        profile: { select: { fullName: true } },
        moduleTreasurers: {
          select: { id: true, moduleName: true }
        }
      }
    });

    for (const user of usersWithTreasuries) {
      const modules = user.moduleTreasurers;
      const moduleNames = modules.map(m => m.moduleName);
      
      const uniqueModules = [...new Set(moduleNames)];
      
      if (moduleNames.length > uniqueModules.length) {
        console.log(`  Usuario: ${user.profile?.fullName} (${user.email})`);
        console.log(`    Módulos actuales: ${moduleNames.join(', ')}`);
        console.log(`    Módulos únicos: ${uniqueModules.join(', ')}`);
        
        for (const moduleName of uniqueModules) {
          const moduleRecords = modules.filter(m => m.moduleName === moduleName);
          if (moduleRecords.length > 1) {
            moduleRecords.sort((a, b) => b.id - a.id);
            const toDelete = moduleRecords.slice(1);
            for (const record of toDelete) {
              await prisma.moduleTreasurer.delete({
                where: { id: record.id }
              });
              console.log(`    Eliminado duplicado ID: ${record.id} para módulo: ${moduleName}`);
            }
          }
        }
      }
    }

    console.log('  ✓ Duplicados de tesoreros eliminados\n');

    // 4. Verificar estado final
    console.log('4. Verificando estado final...\n');

    const finalSubCoordinators = await prisma.moduleSubCoordinator.findMany({
      include: {
        user: {
          select: {
            profile: { select: { fullName: true } }
          }
        }
      },
      orderBy: { moduleName: 'asc' }
    });

    const finalTreasurers = await prisma.moduleTreasurer.findMany({
      include: {
        user: {
          select: {
            profile: { select: { fullName: true } }
          }
        }
      },
      orderBy: { moduleName: 'asc' }
    });

    console.log('SUBCOORDINADORES FINALES:');
    console.log('========================');
    finalSubCoordinators.forEach(sc => {
      console.log(`${sc.moduleName}: ${sc.user.profile?.fullName}`);
    });

    console.log(`\nTotal subcoordinadores: ${finalSubCoordinators.length}`);

    console.log('\nTESOREROS FINALES:');
    console.log('==================');
    finalTreasurers.forEach(t => {
      console.log(`${t.moduleName}: ${t.user.profile?.fullName}`);
    });

    console.log(`\nTotal tesoreros: ${finalTreasurers.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSubCoordinators();
