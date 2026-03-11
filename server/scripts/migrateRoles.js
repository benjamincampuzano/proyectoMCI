const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {

    try {
        // Buscar si existe el rol SUPER_ADMIN
        const superAdminRole = await prisma.role.findUnique({
            where: { name: 'SUPER_ADMIN' }
        });

        if (superAdminRole) {

            // Verificar si ya existe ADMIN
            const existingAdmin = await prisma.role.findUnique({
                where: { name: 'ADMIN' }
            });

            if (existingAdmin) {

                // Mover usuarios
                await prisma.userRole.updateMany({
                    where: { roleId: superAdminRole.id },
                    data: { roleId: existingAdmin.id }
                });

                // Eliminar el rol SUPER_ADMIN
                await prisma.role.delete({
                    where: { id: superAdminRole.id }
                });

            } else {
                // Simplemente renombrar si ADMIN no existe
                await prisma.role.update({
                    where: { id: superAdminRole.id },
                    data: { name: 'ADMIN' }
                });
            }
        } else {
        }
    } catch (error) {
        console.error('Error durante la migración:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
