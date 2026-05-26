const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const normalizeModuleName = (name) => {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, '-');
};

async function fixAllCoordinators() {
  try {
    console.log('=== INICIANDO CORRECCIÓN COMPLETA DE COORDINADORES ===\n');

    // 1. NORMALIZAR ModuleCoordinator
    console.log('1. NORMALIZANDO COORDINADORES DE MÓDULO...');
    const allCoordinators = await prisma.moduleCoordinator.findMany();
    let coordFixed = 0;
    for (const record of allCoordinators) {
      const normalizedName = normalizeModuleName(record.moduleName);
      if (normalizedName !== record.moduleName) {
        await prisma.moduleCoordinator.update({
          where: { id: record.id },
          data: { moduleName: normalizedName }
        });
        console.log(`  Coordinador ID ${record.id}: "${record.moduleName}" -> "${normalizedName}"`);
        coordFixed++;
      }
    }
    console.log(`  ✓ ${coordFixed} coordinadores normalizados\n`);

    // 2. NORMALIZAR ModuleSubCoordinator
    console.log('2. NORMALIZANDO SUBCOORDINADORES...');
    const allSubCoordinators = await prisma.moduleSubCoordinator.findMany();
    let subFixed = 0;
    for (const record of allSubCoordinators) {
      const normalizedName = normalizeModuleName(record.moduleName);
      if (normalizedName !== record.moduleName) {
        await prisma.moduleSubCoordinator.update({
          where: { id: record.id },
          data: { moduleName: normalizedName }
        });
        console.log(`  Subcoordinador ID ${record.id}: "${record.moduleName}" -> "${normalizedName}"`);
        subFixed++;
      }
    }
    console.log(`  ✓ ${subFixed} subcoordinadores normalizados\n`);

    // 3. NORMALIZAR ModuleTreasurer
    console.log('3. NORMALIZANDO TESOREROS...');
    const allTreasurers = await prisma.moduleTreasurer.findMany();
    let treasFixed = 0;
    for (const record of allTreasurers) {
      const normalizedName = normalizeModuleName(record.moduleName);
      if (normalizedName !== record.moduleName) {
        await prisma.moduleTreasurer.update({
          where: { id: record.id },
          data: { moduleName: normalizedName }
        });
        console.log(`  Tesorero ID ${record.id}: "${record.moduleName}" -> "${normalizedName}"`);
        treasFixed++;
      }
    }
    console.log(`  ✓ ${treasFixed} tesoreros normalizados\n`);

    // 4. ELIMINAR DUPLICADOS EN ModuleCoordinator
    console.log('4. ELIMINANDO DUPLICADOS EN COORDINADORES...');
    const coordGrouped = {};
    for (const record of allCoordinators) {
      const key = `${record.userId}|${record.moduleName}|${record.isDeleted}`;
      if (!coordGrouped[key]) coordGrouped[key] = [];
      coordGrouped[key].push(record);
    }
    let coordDupsRemoved = 0;
    for (const key of Object.keys(coordGrouped)) {
      if (coordGrouped[key].length > 1) {
        coordGrouped[key].sort((a, b) => b.id - a.id);
        const toDelete = coordGrouped[key].slice(1);
        for (const record of toDelete) {
          await prisma.moduleCoordinator.delete({ where: { id: record.id } });
          console.log(`  Eliminado duplicado Coordinador ID ${record.id} (userId=${record.userId}, module=${record.moduleName})`);
          coordDupsRemoved++;
        }
      }
    }
    console.log(`  ✓ ${coordDupsRemoved} duplicados de coordinadores eliminados\n`);

    // 5. ELIMINAR DUPLICADOS EN ModuleSubCoordinator
    console.log('5. ELIMINANDO DUPLICADOS EN SUBCOORDINADORES...');
    const subGrouped = {};
    for (const record of allSubCoordinators) {
      const key = `${record.userId}|${record.moduleName}|${record.isDeleted}`;
      if (!subGrouped[key]) subGrouped[key] = [];
      subGrouped[key].push(record);
    }
    let subDupsRemoved = 0;
    for (const key of Object.keys(subGrouped)) {
      if (subGrouped[key].length > 1) {
        subGrouped[key].sort((a, b) => b.id - a.id);
        const toDelete = subGrouped[key].slice(1);
        for (const record of toDelete) {
          await prisma.moduleSubCoordinator.delete({ where: { id: record.id } });
          console.log(`  Eliminado duplicado Subcoordinador ID ${record.id} (userId=${record.userId}, module=${record.moduleName})`);
          subDupsRemoved++;
        }
      }
    }
    console.log(`  ✓ ${subDupsRemoved} duplicados de subcoordinadores eliminados\n`);

    // 6. ELIMINAR DUPLICADOS EN ModuleTreasurer
    console.log('6. ELIMINANDO DUPLICADOS EN TESOREROS...');
    const treasGrouped = {};
    for (const record of allTreasurers) {
      const key = `${record.userId}|${record.moduleName}|${record.isDeleted}`;
      if (!treasGrouped[key]) treasGrouped[key] = [];
      treasGrouped[key].push(record);
    }
    let treasDupsRemoved = 0;
    for (const key of Object.keys(treasGrouped)) {
      if (treasGrouped[key].length > 1) {
        treasGrouped[key].sort((a, b) => b.id - a.id);
        const toDelete = treasGrouped[key].slice(1);
        for (const record of toDelete) {
          await prisma.moduleTreasurer.delete({ where: { id: record.id } });
          console.log(`  Eliminado duplicado Tesorero ID ${record.id} (userId=${record.userId}, module=${record.moduleName})`);
          treasDupsRemoved++;
        }
      }
    }
    console.log(`  ✓ ${treasDupsRemoved} duplicados de tesoreros eliminados\n`);

    // 7. VERIFICAR QUE LOS REGISTROS isDeleted=true NO TENGAN DUPLICADOS ACTIVOS
    console.log('7. VERIFICANDO CONSISTENCIA (soft-delete vs activos)...');
    const [activeCoords, activeSubs, activeTreas] = await Promise.all([
      prisma.moduleCoordinator.findMany({ where: { isDeleted: false } }),
      prisma.moduleSubCoordinator.findMany({ where: { isDeleted: false } }),
      prisma.moduleTreasurer.findMany({ where: { isDeleted: false } })
    ]);

    console.log(`  Coordinadores activos: ${activeCoords.length}`);
    console.log(`  Subcoordinadores activos: ${activeSubs.length}`);
    console.log(`  Tesoreros activos: ${activeTreas.length}`);

    // Verificar que no haya más de un coordinador activo por módulo
    const activeByModule = {};
    activeCoords.forEach(c => {
      if (!activeByModule[c.moduleName]) activeByModule[c.moduleName] = [];
      activeByModule[c.moduleName].push(c);
    });
    let moduleIssues = false;
    for (const [mod, records] of Object.entries(activeByModule)) {
      if (records.length > 1) {
        console.log(`  ⚠️  Módulo "${mod}" tiene ${records.length} coordinadores activos`);
        moduleIssues = true;
      }
    }
    if (!moduleIssues) console.log('  ✓ Todos los módulos tienen máximo 1 coordinador activo');

    console.log('\n=== CORRECCIÓN COMPLETADA ===');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllCoordinators();
