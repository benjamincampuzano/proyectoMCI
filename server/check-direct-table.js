const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDirectTable() {
    try {
        console.log('🔍 Verificando directamente la tabla ModuleCoordinator...\n');

        // 1. Verificar TODOS los registros en ModuleCoordinator
        const allCoordinators = await prisma.moduleCoordinator.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`📋 Total registros en ModuleCoordinator: ${allCoordinators.length}`);
        allCoordinators.forEach(coord => {
            console.log(`  - ID: ${coord.id}, UserID: ${coord.userId}, Module: ${coord.moduleName}`);
            console.log(`    Creado: ${coord.createdAt}`);
        });

        // 2. Buscar específicamente coordinaciones KIDS
        console.log('\n🔍 Buscando coordinaciones KIDS específicas...\n');
        const kidsCoordinators = await prisma.moduleCoordinator.findMany({
            where: {
                moduleName: 'KIDS'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                fullName: true
                            }
                        }
                    }
                }
            }
        });

        console.log(`📋 Coordinaciones KIDS encontradas: ${kidsCoordinators.length}`);
        kidsCoordinators.forEach(coord => {
            console.log(`  - ID: ${coord.id}, UserID: ${coord.userId}`);
            console.log(`    Usuario: ${coord.user.profile?.fullName} (${coord.user.email})`);
            console.log(`    Módulo: ${coord.moduleName}`);
            console.log(`    Creado: ${coord.createdAt}`);
        });

        // 3. Verificar si "Andres y Tatiana" tiene coordinación KIDS
        console.log('\n🔍 Verificando coordinación de "Andres y Tatiana"...\n');
        const andresTatianaCoord = await prisma.moduleCoordinator.findFirst({
            where: {
                userId: 311, // ID de Andres y Tatiana
                moduleName: 'KIDS'
            }
        });

        if (andresTatianaCoord) {
            console.log(`✅ Andres y Tatiana SÍ tiene coordinación KIDS:`);
            console.log(`   ID Coordinación: ${andresTatianaCoord.id}`);
            console.log(`   Creado: ${andresTatianaCoord.createdAt}`);
        } else {
            console.log(`❌ Andres y Tatiana NO tiene coordinación KIDS`);
        }

        // 4. Verificar con consulta SQL directa para estar seguros
        console.log('\n🔍 Verificación con consulta SQL directa...\n');
        const result = await prisma.$queryRaw`
            SELECT 
                mc.id,
                mc."userId",
                mc."moduleName",
                mc."createdAt",
                u.email,
                up."fullName"
            FROM "ModuleCoordinator" mc
            LEFT JOIN "User" u ON mc."userId" = u.id
            LEFT JOIN "UserProfile" up ON u.id = up."userId"
            WHERE mc."moduleName" = 'KIDS'
            ORDER BY mc."createdAt" DESC
        `;

        console.log(`📋 Resultado SQL directo: ${result.length} registros`);
        result.forEach(row => {
            console.log(`  - ${row.fullName} (${row.email}) - ID: ${row.userId}`);
            console.log(`    Módulo: ${row.moduleName}, Creado: ${row.createdAt}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDirectTable();
