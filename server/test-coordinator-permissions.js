const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { canManageUser, MANAGABLE_ROLES, PROTECTED_ROLES, LEADERSHIP_ROLES } = require('./middleware/coordinatorAuth');

const prisma = new PrismaClient();

// Colores para output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    test: (msg) => console.log(`${colors.cyan}▶${colors.reset} ${msg}`)
};

// Contadores de tests
let passed = 0;
let failed = 0;

function assert(condition, testName) {
    if (condition) {
        log.success(testName);
        passed++;
    } else {
        log.error(testName);
        failed++;
    }
}

// Helper para generar tokens JWT
function generateToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            roles: user.roles 
        },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
    );
}

// Crear usuario de test
async function createTestUser(email, roleName, networkId = null, isCoordinator = false) {
    const password = await bcrypt.hash('Test123!@#', 10);
    
    const user = await prisma.user.create({
        data: {
            email,
            password,
            phone: null,
            isCoordinator,
            profile: {
                create: {
                    fullName: `Test User ${email.split('@')[0]}`,
                    sex: 'HOMBRE',
                    network: networkId
                }
            },
            roles: {
                create: {
                    role: {
                        connectOrCreate: {
                            where: { name: roleName },
                            create: { name: roleName }
                        }
                    }
                }
            }
        },
        include: {
            roles: { include: { role: true } },
            profile: true
        }
    });
    
    return user;
}

// Asignar coordinación de módulo
async function assignModuleCoordinator(userId, moduleName) {
    await prisma.moduleCoordinator.deleteMany({
        where: { moduleName }
    });
    
    return await prisma.moduleCoordinator.create({
        data: {
            userId,
            moduleName
        }
    });
}

// Limpiar usuarios de test
async function cleanupTestUsers(emails) {
    for (const email of emails) {
        await prisma.userRole.deleteMany({
            where: {
                user: { email }
            }
        });
        await prisma.moduleCoordinator.deleteMany({
            where: {
                user: { email }
            }
        });
        await prisma.user.deleteMany({
            where: { email }
        });
    }
    log.info('Test users cleaned up');
}

// ============================================================================
// TESTS
// ============================================================================

async function runTests() {
    console.log('\n' + '='.repeat(80));
    console.log('TESTS DE PERMISOS DE COORDINADORES TEMPORALES');
    console.log('='.repeat(80) + '\n');
    
    const testEmails = [];
    
    try {
        // ========================================================================
        // SETUP: Crear usuarios de test
        // ========================================================================
        log.info('Creando usuarios de test...');
        
        // Usuario ADMIN
        const adminUser = await createTestUser('admin.test@iglesia.test', 'ADMIN', null);
        testEmails.push(adminUser.email);
        
        // Usuario PASTOR
        const pastorUser = await createTestUser('pastor.test@iglesia.test', 'PASTOR', null);
        testEmails.push(pastorUser.email);
        
        // LIDER_DOCE Red 1 (normal, sin coordinación)
        const liderDoceRed1 = await createTestUser('liderdoce.red1@iglesia.test', 'LIDER_DOCE', 1);
        testEmails.push(liderDoceRed1.email);
        
        // LIDER_DOCE Red 2 (será coordinador)
        const liderDoceRed2 = await createTestUser('liderdoce.red2@iglesia.test', 'LIDER_DOCE', 2);
        testEmails.push(liderDoceRed2.email);
        
        // LIDER_CELULA Red 1
        const liderCelulaRed1 = await createTestUser('lidercelula.red1@iglesia.test', 'LIDER_CELULA', 1);
        testEmails.push(liderCelulaRed1.email);
        
        // LIDER_CELULA Red 3 (otra red)
        const liderCelulaRed3 = await createTestUser('lidercelula.red3@iglesia.test', 'LIDER_CELULA', 3);
        testEmails.push(liderCelulaRed3.email);
        
        // DISCIPULO Red 1
        const discipuloRed1 = await createTestUser('discipulo.red1@iglesia.test', 'DISCIPULO', 1);
        testEmails.push(discipuloRed1.email);
        
        // DISCIPULO Red 3 (otra red)
        const discipuloRed3 = await createTestUser('discipulo.red3@iglesia.test', 'DISCIPULO', 3);
        testEmails.push(discipuloRed3.email);
        
        // INVITADO Red 2
        const invitadoRed2 = await createTestUser('invitado.red2@iglesia.test', 'INVITADO', 2);
        testEmails.push(invitadoRed2.email);
        
        log.success('Usuarios de test creados exitosamente\n');
        
        // ========================================================================
        // TEST 1: Constantes de roles
        // ========================================================================
        console.log('-'.repeat(80));
        log.test('TEST 1: Verificación de constantes de roles');
        console.log('-'.repeat(80));
        
        assert(
            Array.isArray(MANAGABLE_ROLES) && MANAGABLE_ROLES.length === 3,
            'MANAGABLE_ROLES es array con 3 elementos'
        );
        assert(
            MANAGABLE_ROLES.includes('LIDER_CELULA') && 
            MANAGABLE_ROLES.includes('DISCIPULO') && 
            MANAGABLE_ROLES.includes('INVITADO'),
            'MANAGABLE_ROLES contiene roles correctos'
        );
        assert(
            PROTECTED_ROLES.includes('ADMIN') && 
            PROTECTED_ROLES.includes('PASTOR') && 
            PROTECTED_ROLES.includes('LIDER_DOCE'),
            'PROTECTED_ROLES contiene roles protegidos'
        );
        assert(
            LEADERSHIP_ROLES.includes('ADMIN') && 
            LEADERSHIP_ROLES.includes('PASTOR') && 
            LEADERSHIP_ROLES.includes('LIDER_DOCE'),
            'LEADERSHIP_ROLES contiene roles de liderazgo'
        );
        
        // ========================================================================
        // TEST 2: ADMIN puede gestionar todos los roles excepto ADMIN
        // ========================================================================
        console.log('\n' + '-'.repeat(80));
        log.test('TEST 2: Permisos de ADMIN');
        console.log('-'.repeat(80));
        
        const adminRequester = {
            id: adminUser.id,
            roles: ['ADMIN'],
            isModuleCoordinator: false
        };
        
        let result = await canManageUser(adminRequester, 'PASTOR', null);
        assert(result.canManage === true, 'ADMIN puede gestionar PASTOR');
        
        result = await canManageUser(adminRequester, 'LIDER_DOCE', 1);
        assert(result.canManage === true, 'ADMIN puede gestionar LIDER_DOCE');
        
        result = await canManageUser(adminRequester, 'LIDER_CELULA', 1);
        assert(result.canManage === true, 'ADMIN puede gestionar LIDER_CELULA');
        
        result = await canManageUser(adminRequester, 'DISCIPULO', 1);
        assert(result.canManage === true, 'ADMIN puede gestionar DISCIPULO');
        
        result = await canManageUser(adminRequester, 'INVITADO', 1);
        assert(result.canManage === true, 'ADMIN puede gestionar INVITADO');
        
        result = await canManageUser(adminRequester, 'ADMIN', null);
        assert(result.canManage === false, 'ADMIN NO puede gestionar otro ADMIN');
        assert(result.reason === 'Cannot manage ADMIN users', 'Razón correcta para ADMIN');
        
        // ========================================================================
        // TEST 3: PASTOR puede gestionar todos los roles excepto ADMIN
        // ========================================================================
        console.log('\n' + '-'.repeat(80));
        log.test('TEST 3: Permisos de PASTOR');
        console.log('-'.repeat(80));
        
        const pastorRequester = {
            id: pastorUser.id,
            roles: ['PASTOR'],
            isModuleCoordinator: false
        };
        
        result = await canManageUser(pastorRequester, 'LIDER_DOCE', 1);
        assert(result.canManage === true, 'PASTOR puede gestionar LIDER_DOCE');
        
        result = await canManageUser(pastorRequester, 'LIDER_CELULA', 1);
        assert(result.canManage === true, 'PASTOR puede gestionar LIDER_CELULA');
        
        result = await canManageUser(pastorRequester, 'DISCIPULO', 1);
        assert(result.canManage === true, 'PASTOR puede gestionar DISCIPULO');
        
        result = await canManageUser(pastorRequester, 'INVITADO', 1);
        assert(result.canManage === true, 'PASTOR puede gestionar INVITADO');
        
        result = await canManageUser(pastorRequester, 'ADMIN', null);
        assert(result.canManage === false, 'PASTOR NO puede gestionar ADMIN');
        
        // ========================================================================
        // TEST 4: LIDER_DOCE normal solo gestiona su propia red
        // ========================================================================
        console.log('\n' + '-'.repeat(80));
        log.test('TEST 4: Permisos de LIDER_DOCE normal (sin coordinación)');
        console.log('-'.repeat(80));
        
        const liderNormalRequester = {
            id: liderDoceRed1.id,
            roles: ['LIDER_DOCE'],
            isModuleCoordinator: false
        };
        
        // Misma red - debería poder
        result = await canManageUser(liderNormalRequester, 'LIDER_CELULA', 1);
        assert(result.canManage === true, 'LIDER_DOCE puede gestionar LIDER_CELULA de SU red');
        
        result = await canManageUser(liderNormalRequester, 'DISCIPULO', 1);
        assert(result.canManage === true, 'LIDER_DOCE puede gestionar DISCIPULO de SU red');
        
        result = await canManageUser(liderNormalRequester, 'INVITADO', 1);
        assert(result.canManage === true, 'LIDER_DOCE puede gestionar INVITADO de SU red');
        
        // Otra red - NO debería poder
        result = await canManageUser(liderNormalRequester, 'LIDER_CELULA', 3);
        assert(result.canManage === false, 'LIDER_DOCE NO puede gestionar LIDER_CELULA de OTRA red');
        assert(result.reason === 'Cannot manage users outside your network', 'Razón: fuera de red');
        
        result = await canManageUser(liderNormalRequester, 'DISCIPULO', 3);
        assert(result.canManage === false, 'LIDER_DOCE NO puede gestionar DISCIPULO de OTRA red');
        
        // Roles protegidos - NUNCA debería poder
        result = await canManageUser(liderNormalRequester, 'ADMIN', 1);
        assert(result.canManage === false, 'LIDER_DOCE NO puede gestionar ADMIN');
        
        result = await canManageUser(liderNormalRequester, 'PASTOR', 1);
        assert(result.canManage === false, 'LIDER_DOCE NO puede gestionar PASTOR');
        
        result = await canManageUser(liderNormalRequester, 'LIDER_DOCE', 1);
        assert(result.canManage === false, 'LIDER_DOCE NO puede gestionar otro LIDER_DOCE');
        
        // ========================================================================
        // TEST 5: LIDER_DOCE + Coordinador gestiona cualquier red
        // ========================================================================
        console.log('\n' + '-'.repeat(80));
        log.test('TEST 5: Permisos de LIDER_DOCE + COORDINADOR (permisos temporales)');
        console.log('-'.repeat(80));
        
        // Asignar coordinación
        await assignModuleCoordinator(liderDoceRed2.id, 'Kids');
        log.info('Coordinador asignado al módulo Kids');
        
        const coordinatorRequester = {
            id: liderDoceRed2.id,
            roles: ['LIDER_DOCE'],
            isModuleCoordinator: true,
            coordinatedModule: 'Kids'
        };
        
        // Misma red - debería poder
        result = await canManageUser(coordinatorRequester, 'LIDER_CELULA', 2);
        assert(result.canManage === true, 'COORDINADOR puede gestionar LIDER_CELULA de SU red');
        
        result = await canManageUser(coordinatorRequester, 'DISCIPULO', 2);
        assert(result.canManage === true, 'COORDINADOR puede gestionar DISCIPULO de SU red');
        
        // OTRA red - SÍ debería poder (esta es la clave!)
        result = await canManageUser(coordinatorRequester, 'LIDER_CELULA', 1);
        assert(result.canManage === true, 'COORDINADOR puede gestionar LIDER_CELULA de OTRA red');
        
        result = await canManageUser(coordinatorRequester, 'LIDER_CELULA', 3);
        assert(result.canManage === true, 'COORDINADOR puede gestionar LIDER_CELULA de CUALQUIER red');
        
        result = await canManageUser(coordinatorRequester, 'DISCIPULO', 1);
        assert(result.canManage === true, 'COORDINADOR puede gestionar DISCIPULO de OTRA red');
        
        result = await canManageUser(coordinatorRequester, 'INVITADO', 3);
        assert(result.canManage === true, 'COORDINADOR puede gestionar INVITADO de OTRA red');
        
        // Roles protegidos - NUNCA debería poder (incluso siendo coordinador)
        result = await canManageUser(coordinatorRequester, 'ADMIN', 1);
        assert(result.canManage === false, 'COORDINADOR NO puede gestionar ADMIN');
        
        result = await canManageUser(coordinatorRequester, 'PASTOR', 2);
        assert(result.canManage === false, 'COORDINADOR NO puede gestionar PASTOR');
        
        result = await canManageUser(coordinatorRequester, 'LIDER_DOCE', 1);
        assert(result.canManage === false, 'COORDINADOR NO puede gestionar LIDER_DOCE');
        assert(result.reason === 'Cannot manage LIDER_DOCE users', 'Razón correcta para LIDER_DOCE');
        
        // ========================================================================
        // TEST 6: Verificación de revocación de coordinación
        // ========================================================================
        console.log('\n' + '-'.repeat(80));
        log.test('TEST 6: Revocación de coordinación (vuelve a LIDER_DOCE normal)');
        console.log('-'.repeat(80));
        
        // Remover coordinación
        await prisma.moduleCoordinator.deleteMany({
            where: { userId: liderDoceRed2.id }
        });
        log.info('Coordinación removida');
        
        const exCoordinatorRequester = {
            id: liderDoceRed2.id,
            roles: ['LIDER_DOCE'],
            isModuleCoordinator: false
        };
        
        // Ahora NO debería poder gestionar otras redes
        result = await canManageUser(exCoordinatorRequester, 'LIDER_CELULA', 1);
        assert(result.canManage === false, 'Ex-COORDINADOR NO puede gestionar OTRA red después de revocación');
        assert(result.reason === 'Cannot manage users outside your network', 'Razón: fuera de red');
        
        // Pero SÍ puede gestionar su propia red
        result = await canManageUser(exCoordinatorRequester, 'LIDER_CELULA', 2);
        assert(result.canManage === true, 'Ex-COORDINADOR puede gestionar SU red después de revocación');
        
        // ========================================================================
        // TEST 7: Roles no soportados
        // ========================================================================
        console.log('\n' + '-'.repeat(80));
        log.test('TEST 7: Usuarios sin permisos (DISCIPULO, INVITADO)');
        console.log('-'.repeat(80));
        
        const discipuloRequester = {
            id: discipuloRed1.id,
            roles: ['DISCIPULO'],
            isModuleCoordinator: false
        };
        
        result = await canManageUser(discipuloRequester, 'INVITADO', 1);
        assert(result.canManage === false, 'DISCIPULO NO puede gestionar otros usuarios');
        assert(result.reason === 'Insufficient permissions', 'Razón: permisos insuficientes');
        
        const invitadoRequester = {
            id: invitadoRed2.id,
            roles: ['INVITADO'],
            isModuleCoordinator: false
        };
        
        result = await canManageUser(invitadoRequester, 'DISCIPULO', 2);
        assert(result.canManage === false, 'INVITADO NO puede gestionar otros usuarios');
        
        // ========================================================================
        // TEST 8: Generación de tokens JWT
        // ========================================================================
        console.log('\n' + '-'.repeat(80));
        log.test('TEST 8: Generación de tokens JWT para usuarios');
        console.log('-'.repeat(80));
        
        const adminToken = generateToken({
            id: adminUser.id,
            email: adminUser.email,
            roles: ['ADMIN']
        });
        assert(adminToken && adminToken.length > 0, 'Token ADMIN generado correctamente');
        
        const coordinatorToken = generateToken({
            id: liderDoceRed2.id,
            email: liderDoceRed2.email,
            roles: ['LIDER_DOCE']
        });
        assert(coordinatorToken && coordinatorToken.length > 0, 'Token COORDINADOR generado correctamente');
        
        // ========================================================================
        // RESUMEN
        // ========================================================================
        console.log('\n' + '='.repeat(80));
        console.log('RESUMEN DE TESTS');
        console.log('='.repeat(80));
        console.log(`${colors.green}Tests aprobados: ${passed}${colors.reset}`);
        console.log(`${colors.red}Tests fallidos: ${failed}${colors.reset}`);
        console.log(`Total: ${passed + failed}`);
        console.log(`Éxito: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
        console.log('='.repeat(80) + '\n');
        
        if (failed === 0) {
            log.success('¡TODOS LOS TESTS PASARON! El sistema de permisos funciona correctamente.\n');
        } else {
            log.error(`ALGUNOS TESTS FALLARON. Revisar ${failed} errores.\n`);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n' + colors.red + 'ERROR DURANTE LOS TESTS:' + colors.reset);
        console.error(error);
        process.exit(1);
    } finally {
        // Cleanup
        if (testEmails.length > 0) {
            log.info('Limpiando usuarios de test...');
            await cleanupTestUsers(testEmails);
        }
        await prisma.$disconnect();
    }
}

// Ejecutar tests
runTests();
