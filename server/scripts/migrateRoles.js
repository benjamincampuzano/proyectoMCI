const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando migración de roles...');

    try {
        // Buscar si existe el rol SUPER_ADMIN
        const superAdminRole = await prisma.role.findUnique({
            where: { name: 'SUPER_ADMIN' }
        });

        if (superAdminRole) {
            console.log('Encontrado rol SUPER_ADMIN. Renombrando a ADMIN...');

            // Verificar si ya existe ADMIN
            const existingAdmin = await prisma.role.findUnique({
                where: { name: 'ADMIN' }
            });

            if (existingAdmin) {
                console.log('El rol ADMIN ya existe. Moviendo usuarios de SUPER_ADMIN a ADMIN...');

                // Mover usuarios
                await prisma.userRole.updateMany({
                    where: { roleId: superAdminRole.id },
                    data: { roleId: existingAdmin.id }
                });

                // Eliminar el rol SUPER_ADMIN
                await prisma.role.delete({
                    where: { id: superAdminRole.id }
                });

                console.log('Usuarios migrados y rol SUPER_ADMIN eliminado.');
            } else {
                // Simplemente renombrar si ADMIN no existe
                await prisma.role.update({
                    where: { id: superAdminRole.id },
                    data: { name: 'ADMIN' }
                });
                console.log('Rol SUPER_ADMIN renombrado a ADMIN.');
            }
        } else {
            console.log('No se encontró el rol SUPER_ADMIN. No hay nada que migrar.');
        }
    } catch (error) {
        console.error('Error durante la migración:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
