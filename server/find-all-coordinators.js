const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAllCoordinators() {
    try {
        console.log('🔍 Buscando TODOS los usuarios con nombres similares...\n');

        // 1. Buscar usuarios con "Andres" o "Tatiana" en el nombre
        const similarUsers = await prisma.user.findMany({
            where: {
                OR: [
                    {
                        profile: {
                            fullName: {
                                contains: 'Andres',
                                mode: 'insensitive'
                            }
                        }
                    },
                    {
                        profile: {
                            fullName: {
                                contains: 'Tatiana',
                                mode: 'insensitive'
                            }
                        }
                    },
                    {
                        profile: {
                            fullName: {
                                contains: 'Andrea',
                                mode: 'insensitive'
                            }
                        }
                    }
                ]
            },
            include: {
                profile: true,
                moduleCoordinations: true,
                roles: {
                    select: {
                        role: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        console.log(`📋 Usuarios con nombres similares: ${similarUsers.length}`);
        similarUsers.forEach(user => {
            console.log(`  - ${user.profile?.fullName} (ID: ${user.id})`);
            console.log(`    Email: ${user.email}`);
            console.log(`    Roles: ${user.roles.map(r => r.role.name).join(', ')}`);
            console.log(`    Coordinaciones: ${user.moduleCoordinations.length}`);
            user.moduleCoordinations.forEach(coord => {
                console.log(`      * ${coord.moduleName} (desde ${coord.createdAt})`);
            });
            console.log('');
        });

        // 2. Verificar TODOS los coordinadores de KIDS que existen
        console.log('🔍 Verificando TODOS los coordinadores KIDS existentes...\n');
        const allKidsCoordinators = await prisma.moduleCoordinator.findMany({
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
                        },
                        roles: {
                            select: {
                                role: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (allKidsCoordinators.length === 0) {
            console.log('❌ NO HAY NINGÚN COORDINADOR ASIGNADO AL MÓDULO KIDS');
            console.log('\n💡 Para asignar un coordinador, necesitas:');
            console.log('   1. Un usuario con rol LIDER_DOCE');
            console.log('   2. Asignarlo como coordinador del módulo KIDS');
            console.log('   3. Esto se hace normalmente desde la interfaz del módulo KIDS');
        } else {
            console.log(`✅ Coordinadores KIDS encontrados: ${allKidsCoordinators.length}`);
            allKidsCoordinators.forEach(coord => {
                console.log(`  - ${coord.user.profile?.fullName} (${coord.user.email})`);
                console.log(`    ID: ${coord.user.id}, Rol: ${coord.user.roles.map(r => r.role.name).join(', ')}`);
                console.log(`    Asignado: ${coord.createdAt}`);
            });
        }

        // 3. Buscar usuarios con rol LIDER_DOCE (que podrían ser coordinadores)
        console.log('\n🔍 Usuarios con rol LIDER_DOCE (posibles coordinadores)...\n');
        const liderDoceUsers = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'LIDER_DOCE'
                        }
                    }
                },
                isDeleted: false
            },
            include: {
                profile: true,
                moduleCoordinations: {
                    where: {
                        moduleName: 'KIDS'
                    }
                }
            },
            orderBy: {
                profile: {
                    fullName: 'asc'
                }
            }
        });

        console.log(`📋 Usuarios LIDER_DOCE: ${liderDoceUsers.length}`);
        liderDoceUsers.forEach(user => {
            const isKidsCoordinator = user.moduleCoordinations.length > 0;
            console.log(`  - ${user.profile?.fullName} (ID: ${user.id}) ${isKidsCoordinator ? '✅' : '❌'}`);
            console.log(`    Email: ${user.email}`);
            if (isKidsCoordinator) {
                console.log(`    ✅ Ya es coordinador KIDS`);
            } else {
                console.log(`    ❌ NO es coordinador KIDS (podría ser asignado)`);
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findAllCoordinators();
