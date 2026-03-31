const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCoordinatorFix() {
    try {
        console.log('🧪 Probando la corrección de case sensitivity...\n');

        // 1. Probar la consulta corregida
        console.log('🔍 Probando consulta con case insensitive...');
        const coordinatorRes = await prisma.moduleCoordinator.findFirst({
            where: {
                userId: 311, // Andres y Tatiana
                moduleName: {
                    in: ['KIDS', 'kids'] // Buscar ambas variantes
                }
            }
        });

        if (coordinatorRes) {
            console.log('✅ Consulta corregida funciona:');
            console.log(`   ID: ${coordinatorRes.id}`);
            console.log(`   UserID: ${coordinatorRes.userId}`);
            console.log(`   Module: ${coordinatorRes.moduleName}`);
            console.log(`   Created: ${coordinatorRes.createdAt}`);
        } else {
            console.log('❌ Consulta corregida no encontró resultados');
        }

        // 2. Probar la lógica completa de checkKidsAccess
        console.log('\n🔍 Probando lógica completa de checkKidsAccess...');
        
        const userId = 311; // Andres y Tatiana
        const userRoles = ['LIDER_DOCE']; // Su rol
        
        console.log(`🔍 Checking KIDS access for user ${userId} with roles: ${userRoles.join(', ')}`);

        // Admin always has access
        if (userRoles.includes('ADMIN')) {
            console.log(`✅ User ${userId} is ADMIN - granting access`);
        } else {
            console.log(`❌ User ${userId} is NOT ADMIN`);

            // Check if user is coordinator of KIDS module
            console.log(`🔍 Checking if user ${userId} is KIDS coordinator...`);
            const coordinatorCheck = await prisma.moduleCoordinator.findFirst({
                where: {
                    userId: userId,
                    moduleName: {
                        in: ['KIDS', 'kids']
                    }
                }
            });

            if (coordinatorCheck) {
                console.log(`✅ User ${userId} is KIDS coordinator - granting access`);
                console.log(`   Coordinator ID: ${coordinatorCheck.id}, Module: ${coordinatorCheck.moduleName}`);
            } else {
                console.log(`❌ User ${userId} is NOT KIDS coordinator`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testCoordinatorFix();
