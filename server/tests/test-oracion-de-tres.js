const { PrismaClient } = require('@prisma/client');
const oracionDeTresController = require('../controllers/oracionDeTresController');

const prisma = new PrismaClient();

const mockRequest = (body = {}, params = {}, user = null) => ({
    body,
    params,
    user,
    ip: '127.0.0.1',
    headers: { 'user-agent': 'TestRunner' }
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

async function ensureTestUsers() {
    // 1. Ensure Role records exist
    const roles = ['LIDER_DOCE', 'DISCIPULO', 'ADMIN'];
    for (const rName of roles) {
        await prisma.role.upsert({
            where: { name: rName },
            update: {},
            create: { name: rName }
        });
    }

    // 2. Create Leader 12
    const leaderEmail = 'test_lider12@example.com';
    let leader = await prisma.user.findUnique({ where: { email: leaderEmail } });
    if (!leader) {
        leader = await prisma.user.create({
            data: {
                email: leaderEmail,
                password: 'hashedpassword',
                roles: {
                    create: { role: { connect: { name: 'LIDER_DOCE' } } }
                },
                profile: { create: { fullName: 'Test LIDER 12' } }
            }
        });
    }

    // 3. Create 3 Disciples
    const disciples = [];
    for (let i = 1; i <= 3; i++) {
        const email = `test_disciple${i}@example.com`;
        let d = await prisma.user.findUnique({ where: { email } });
        if (!d) {
            d = await prisma.user.create({
                data: {
                    email,
                    password: 'hashedpassword',
                    roles: {
                        create: { role: { connect: { name: 'DISCIPULO' } } }
                    },
                    profile: { create: { fullName: `Test Disciple ${i}` } }
                }
            });
        }
        disciples.push(d);
    }

    // 4. Create Admin
    const adminEmail = 'test_admin@example.com';
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
        admin = await prisma.user.create({
            data: {
                email: adminEmail,
                password: 'hashedpassword',
                roles: {
                    create: { role: { connect: { name: 'ADMIN' } } }
                },
                profile: { create: { fullName: 'Test ADMIN' } }
            }
        });
    }

    return { leader, disciples, admin };
}

async function testOracionDeTres() {
    console.log('=== PRUEBAS DE ORACIÓN DE TRES ===\n');

    try {
        const { leader, disciples, admin } = await ensureTestUsers();

        const leaderUser = {
            id: leader.id,
            roles: ['LIDER_DOCE']
        };

        const adminUser = {
            id: admin.id,
            roles: ['ADMIN']
        };

        const discipleUser = {
            id: disciples[0].id,
            roles: ['DISCIPULO']
        };

        // --- Test 1: LIDER_DOCE Role Restriction ---
        console.log('Test 1: Solo LIDER_DOCE puede crear grupos');
        const req1 = mockRequest({}, {}, discipleUser);
        const res1 = mockResponse();
        await oracionDeTresController.createGroup(req1, res1);
        if (res1.statusCode === 403) console.log('✅ Correcto: Discípulo no pudo crear grupo.');
        else console.log('❌ Fallo: Discípulo pudo crear grupo o error inesperado.');

        // --- Test 1b: ADMIN Role Authorization ---
        console.log('\nTest 1b: ADMINISTRADOR puede crear grupos');
        const testGroupAdmin = {
            fechaInicio: new Date(),
            miembros: [disciples[0].id, disciples[1].id, disciples[2].id],
            personas: [
                { nombre: 'Admin Obj 1', telefono: '111' },
                { nombre: 'Admin Obj 2', telefono: '222' },
                { nombre: 'Admin Obj 3', telefono: '333' }
            ]
        };
        const req1b = mockRequest(testGroupAdmin, {}, adminUser);
        const res1b = mockResponse();
        await oracionDeTresController.createGroup(req1b, res1b);
        if (res1b.data && res1b.data.id) {
            console.log('✅ Correcto: Administrador pudo crear grupo.');
            await prisma.oracionDeTres.delete({ where: { id: res1b.data.id } });
        } else {
            console.log('❌ Fallo: Administrador no pudo crear grupo.');
        }

        // --- Test 2: Exact 3 Members Validation ---
        console.log('\nTest 2: Validación de exactamente 3 miembros');
        const req2 = mockRequest({
            fechaInicio: new Date(),
            miembros: [disciples[0].id, disciples[1].id], // Solo 2
            personas: [{ nombre: 'P1', telefono: '1' }, { nombre: 'P2', telefono: '2' }, { nombre: 'P3', telefono: '3' }]
        }, {}, leaderUser);
        const res2 = mockResponse();
        await oracionDeTresController.createGroup(req2, res2);
        if (res2.statusCode === 400) console.log('✅ Correcto: Rechazó grupo con 2 miembros.');
        else console.log('❌ Fallo: Aceptó grupo con 2 miembros.');

        // --- Test 3: Creation Success ---
        console.log('\nTest 3: Creación exitosa');
        const testGroupData = {
            fechaInicio: new Date(),
            miembros: [disciples[0].id, disciples[1].id, disciples[2].id],
            personas: [
                { nombre: 'Objetivo 1', telefono: '3001234567' },
                { nombre: 'Objetivo 2', telefono: '3001234568' },
                { nombre: 'Objetivo 3', telefono: '3001234569' }
            ]
        };
        const req3 = mockRequest(testGroupData, {}, leaderUser);
        const res3 = mockResponse();
        await oracionDeTresController.createGroup(req3, res3);

        let groupId;
        if (res3.data && res3.data.id) {
            groupId = res3.data.id;
            console.log(`✅ Grupo creado correctamente. ID: ${groupId}`);
        } else {
            console.log('❌ Fallo al crear grupo:', res3.data);
            return;
        }

        // --- Test 4: Meeting Frequency (Max 1 per week) ---
        console.log('\nTest 4: Reunión semanal máxima (1/semana)');
        const fechaReunion = new Date();
        const req4a = mockRequest({ oracionDeTresId: groupId, fecha: fechaReunion, hora: '10:00' }, {}, leaderUser);
        const res4a = mockResponse();
        await oracionDeTresController.addMeeting(req4a, res4a);
        if (res4a.data && res4a.data.id) console.log('✅ Primera reunión agregada.');

        const req4b = mockRequest({ oracionDeTresId: groupId, fecha: fechaReunion, hora: '11:00' }, {}, leaderUser);
        const res4b = mockResponse();
        await oracionDeTresController.addMeeting(req4b, res4b);
        if (res4b.statusCode === 400) console.log('✅ Correcto: Rechazó segunda reunión en la misma semana.');
        else console.log('❌ Fallo: Permitió segunda reunión en la misma semana.');

        // --- Test 5: Date range validation for meetings ---
        console.log('\nTest 5: Validación de rango de fechas para reuniones');
        const fechaFuera = new Date();
        fechaFuera.setMonth(fechaFuera.getMonth() + 2); // Fuera de 1 mes
        const req5 = mockRequest({ oracionDeTresId: groupId, fecha: fechaFuera, hora: '10:00' }, {}, leaderUser);
        const res5 = mockResponse();
        await oracionDeTresController.addMeeting(req5, res5);
        if (res5.statusCode === 400) console.log('✅ Correcto: Rechazó reunión fuera de fecha.');
        else console.log('❌ Fallo: Permitió reunión fuera de fecha.');

        // --- Test 6: Update Group ---
        console.log('\nTest 6: Actualización de grupo');
        const updateData = {
            fechaInicio: new Date(),
            personas: [
                { nombre: 'Objetivo Modificado', telefono: '999' },
                { nombre: 'Objetivo 2', telefono: '3001234568' },
                { nombre: 'Objetivo 3', telefono: '3001234569' }
            ]
        };
        const req6 = mockRequest(updateData, { id: groupId.toString() }, leaderUser);
        const res6 = mockResponse();
        await oracionDeTresController.updateGroup(req6, res6);
        if (res6.data && res6.data.personas.some(p => p.nombre === 'Objetivo Modificado')) {
            console.log('✅ Correcto: Grupo actualizado exitosamente.');
        } else {
            console.log('❌ Fallo: El grupo no se actualizó correctamente.', res6.data);
        }

        // --- Test 7: Delete Group ---
        console.log('\nTest 7: Eliminación de grupo');
        const req7 = mockRequest({}, { id: groupId.toString() }, leaderUser);
        const res7 = mockResponse();
        await oracionDeTresController.deleteGroup(req7, res7);
        if (res7.statusCode !== 403 && res7.data && res7.data.message) {
            console.log('✅ Correcto: Grupo eliminado exitosamente.');
            const deletedCheck = await prisma.oracionDeTres.findUnique({ where: { id: groupId } });
            if (!deletedCheck) console.log('✅ Verificado: El grupo ya no existe en la BD.');
        } else {
            console.log('❌ Fallo al eliminar grupo:', res7.data);
        }

        console.log('\n✅ Todas las pruebas de CRUD finalizadas.');

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testOracionDeTres();
