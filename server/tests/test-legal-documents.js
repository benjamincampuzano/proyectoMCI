const { PrismaClient } = require('@prisma/client');
const legalDocumentController = require('../controllers/legalDocumentController');

const prisma = new PrismaClient();

const mockRequest = (body = {}, params = {}, user = null) => ({
    body,
    params,
    user,
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

async function testLegalDocuments() {
    console.log('=== PRUEBAS DEL MÓDULO DE DOCUMENTOS LEGALES ===\n');

    try {
        const adminUserRaw = await prisma.user.findFirst({
            where: { roles: { some: { role: { name: 'ADMIN' } } } },
            include: { roles: { include: { role: true } } }
        });

        const adminUser = {
            ...adminUserRaw,
            roles: adminUserRaw.roles.map(r => r.role.name)
        };

        // Test 1: Crear documento
        console.log('Test 1: Crear documento legal');
        const reqCreate = mockRequest({
            name: 'Política de Prueba',
            url: 'https://example.com/legal.pdf'
        }, {}, adminUser);
        const resCreate = mockResponse();
        await legalDocumentController.createDocument(reqCreate, resCreate);

        if (resCreate.statusCode === 201) {
            console.log('✅ Documento creado exitosamente');
            const docId = resCreate.data.id;

            // Test 2: Listar documentos
            console.log('Test 2: Listar documentos');
            const resList = mockResponse();
            await legalDocumentController.getAllDocuments({}, resList);
            if (resList.statusCode === 200 && resList.data.some(d => d.id === docId)) {
                console.log('✅ Documento aparece en la lista');
            }

            // Test 3: Eliminar documento (soft delete)
            console.log('Test 3: Eliminar documento');
            const reqDelete = mockRequest({}, { id: docId.toString() }, adminUser);
            const resDelete = mockResponse();
            await legalDocumentController.deleteDocument(reqDelete, resDelete);

            if (resDelete.statusCode === 200) {
                const docInDb = await prisma.legalDocument.findUnique({ where: { id: docId } });
                if (docInDb.active === false) {
                    console.log('✅ Documento marcado como inactivo (soft delete)');
                }
            }

            // Limpiar físicamente
            await prisma.legalDocument.delete({ where: { id: docId } });
        } else {
            console.log('❌ Falló crear documento', resCreate.data);
        }

    } catch (error) {
        console.log('❌ Error en pruebas de documentos:', error.message);
    }

    console.log('\n=== FIN DE PRUEBAS DE DOCUMENTOS LEGALES ===');
}

testLegalDocuments()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
