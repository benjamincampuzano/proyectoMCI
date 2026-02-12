const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const userController = require('../controllers/userController');

const prisma = new PrismaClient();

const mockRequest = (body = {}, params = {}, user = null, query = {}) => ({
    body,
    params,
    user,
    query,
    ip: '127.0.0.1',
    headers: { 'user-agent': 'test-agent' }
});

const mockResponse = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function testUsersModule() {
    console.log('=== PRUEBAS DEL MÓDULO DE USUARIOS ===\n');

    try {
        const adminUserRaw = await prisma.user.findFirst({
            where: { roles: { some: { role: { name: 'ADMIN' } } } },
            include: { roles: { include: { role: true } } }
        });

        if (!adminUserRaw) {
            console.log('❌ No hay usuario administrador en la BD');
            return;
        }

        const adminUser = {
            ...adminUserRaw,
            roles: adminUserRaw.roles.map(r => r.role.name)
        };

        // Test 1: Obtener todos los usuarios
        console.log('Test 1: Obtener todos los usuarios (como ADMIN)');
        let req = mockRequest({}, {}, adminUser);
        let res = mockResponse();
        await userController.getAllUsers(req, res);

        if (res.statusCode === 200 && Array.isArray(res.data)) {
            console.log(`✅ Obtuvo ${res.data.length} usuarios correctamente`);
        } else {
            console.log('❌ Falló obtener usuarios');
        }

        // Test 3: Crear nuevo usuario con autorización
        console.log('\nTest 3: Crear nuevo usuario con autorización');
        const testUserEmail = `testuser_${Date.now()}@test.com`;
        req = mockRequest({
            email: testUserEmail,
            password: 'test123userA!',
            fullName: 'Usuario de Prueba',
            role: 'DISCIPULO',
            dataPolicyAccepted: true,
            dataTreatmentAuthorized: true,
            minorConsentAuthorized: false
        }, {}, adminUser);
        res = mockResponse();
        await userController.createUser(req, res);

        if (res.statusCode === 201 && res.data.user) {
            console.log('✅ Usuario creado correctamente. Verificando en BD...');

            const userInDb = await prisma.user.findUnique({
                where: { id: res.data.user.id },
                include: { profile: true }
            });

            if (userInDb.profile.dataPolicyAccepted === true && userInDb.profile.dataTreatmentAuthorized === true) {
                console.log('✅ Los campos de autorización se guardaron correctamente en la BD');
            } else {
                console.log('❌ Los campos de autorización NO se guardaron correctamente');
            }
            await prisma.user.delete({ where: { id: res.data.user.id } });
        } else {
            console.log('❌ Falló crear usuario', res.data);
        }

    } catch (error) {
        console.log('❌ Error en pruebas de usuarios:', error.message);
    }

    console.log('\n=== FIN DE PRUEBAS DE USUARIOS ===');
}

testUsersModule()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
