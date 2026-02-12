const { PrismaClient } = require('@prisma/client');
const guestController = require('../controllers/guestController');

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

async function testGuestsModule() {
    console.log('=== PRUEBAS DEL MÓDULO DE INVITADOS ===\n');

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

        // Test 1: Crear nuevo invitado con autorización
        console.log('Test 1: Crear nuevo invitado con autorización');
        const testGuestData = {
            name: `Invitado de Prueba ${Date.now()}`,
            phone: `300${Date.now().toString().slice(-7)}`,
            address: 'Dirección de prueba',
            prayerRequest: 'Oración de prueba',
            invitedById: adminUser.id,
            dataPolicyAccepted: true,
            dataTreatmentAuthorized: true,
            minorConsentAuthorized: false
        };

        const req = mockRequest(testGuestData, {}, adminUser);
        const res = mockResponse();
        await guestController.createGuest(req, res);

        if (res.statusCode === 201 && res.data.guest) {
            console.log('✅ Invitado creado correctamente. Verificando en BD...');

            const guestInDb = await prisma.guest.findUnique({
                where: { id: res.data.guest.id }
            });

            if (guestInDb.dataPolicyAccepted === true && guestInDb.dataTreatmentAuthorized === true) {
                console.log('✅ Los campos de autorización se guardaron correctamente en el invitado');
            } else {
                console.log('❌ Los campos de autorización NO se guardaron correctamente');
            }
            await prisma.guest.delete({ where: { id: res.data.guest.id } });
        } else {
            console.log('❌ Falló crear invitado', res.data);
        }

    } catch (error) {
        console.log('❌ Error en pruebas de invitados:', error.message);
    }

    console.log('\n=== FIN DE PRUEBAS DE INVITADOS ===');
}

testGuestsModule()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
