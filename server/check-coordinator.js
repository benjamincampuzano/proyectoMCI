const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCoordinator() {
    try {
        console.log('🔍 Verificando coordinadores del módulo KIDS...\n');

        // 1. Buscar todos los coordinadores de KIDS
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

        console.log(`📋 Coordinadores encontrados para módulo KIDS: ${kidsCoordinators.length}`);
        kidsCoordinators.forEach(coord => {
            console.log(`  - ${coord.user.profile?.fullName || 'Sin Nombre'} (${coord.user.email}) - ID: ${coord.user.id}`);
            console.log(`    Roles: ${coord.user.roles.map(r => r.role.name).join(', ')}`);
            console.log(`    Asignado: ${coord.createdAt}`);
        });

        // 2. Buscar específicamente a "Andrés y Tatiana"
        console.log('\n🔍 Buscando específicamente a "Andrés y Tatiana"...');
        const andresTatiana = await prisma.user.findFirst({
            where: {
                profile: {
                    fullName: {
                        contains: 'Andres',
                        mode: 'insensitive'
                    }
                }
            },
            include: {
                profile: true,
                moduleCoordinations: {
                    where: {
                        moduleName: 'KIDS'
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
        });

        if (andresTatiana) {
            console.log(`✅ Usuario encontrado: ${andresTatiana.profile?.fullName}`);
            console.log(`   ID: ${andresTatiana.id}`);
            console.log(`   Email: ${andresTatiana.email}`);
            console.log(`   Roles: ${andresTatiana.roles.map(r => r.role.name).join(', ')}`);
            console.log(`   Coordinaciones KIDS: ${andresTatiana.moduleCoordinations.length}`);
            
            if (andresTatiana.moduleCoordinations.length > 0) {
                andresTatiana.moduleCoordinations.forEach(coord => {
                    console.log(`     - Módulo: ${coord.moduleName}, Asignado: ${coord.createdAt}`);
                });
            } else {
                console.log(`   ❌ NO tiene coordinaciones de KIDS asignadas`);
            }
        } else {
            console.log('❌ Usuario "Andrés y Tatiana" no encontrado');
        }

        // 3. Verificar si hay schedules asignados a este usuario
        if (andresTatiana) {
            console.log('\n🔍 Verificando si tiene clases KIDS asignadas...');
            const kidsSchedules = await prisma.kidsSchedule.findMany({
                where: {
                    OR: [
                        { teacherId: andresTatiana.id },
                        { auxiliaryId: andresTatiana.id }
                    ]
                },
                include: {
                    module: {
                        select: {
                            name: true,
                            type: true
                        }
                    }
                }
            });

            console.log(`   Clases KIDS asignadas: ${kidsSchedules.length}`);
            kidsSchedules.forEach(schedule => {
                const role = schedule.teacherId === andresTatiana.id ? 'Profesor' : 'Auxiliar';
                console.log(`     - ${role} en ${schedule.module.name} (${schedule.date})`);
            });
        }

        // 4. Verificar si tiene estudiantes KIDS en su jerarquía
        if (andresTatiana) {
            console.log('\n🔍 Verificando si tiene estudiantes KIDS en su jerarquía...');
            const kidsInHierarchy = await prisma.user.findFirst({
                where: {
                    id: andresTatiana.id,
                    children: {
                        some: {
                            child: {
                                seminarEnrollments: {
                                    some: {
                                        module: {
                                            type: 'KIDS'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                include: {
                    children: {
                        include: {
                            child: {
                                include: {
                                    seminarEnrollments: {
                                        where: {
                                            module: {
                                                type: 'KIDS'
                                            }
                                        },
                                        include: {
                                            module: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (kidsInHierarchy) {
                console.log(`   ✅ Tiene estudiantes KIDS en su jerarquía`);
                let totalKidsStudents = 0;
                kidsInHierarchy.children.forEach(childRel => {
                    const kidsEnrollments = childRel.child.seminarEnrollments.filter(e => e.module.type === 'KIDS');
                    if (kidsEnrollments.length > 0) {
                        console.log(`     - ${childRel.child.profile?.fullName}: ${kidsEnrollments.length} inscripciones KIDS`);
                        totalKidsStudents += kidsEnrollments.length;
                    }
                });
                console.log(`   Total estudiantes KIDS: ${totalKidsStudents}`);
            } else {
                console.log(`   ❌ NO tiene estudiantes KIDS en su jerarquía`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCoordinator();
