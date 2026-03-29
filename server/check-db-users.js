// Script para consultar directamente la base de datos y encontrar usuarios
const { PrismaClient } = require('@prisma/client');

async function findUsersInDB() {
    console.log('🔍 Consultando usuarios directamente en la base de datos...\n');
    
    const prisma = new PrismaClient();
    
    try {
        // 1. Contar usuarios
        const userCount = await prisma.user.count();
        console.log(`📊 Total de usuarios en la BD: ${userCount}\n`);
        
        if (userCount === 0) {
            console.log('❌ No hay usuarios en la base de datos');
            console.log('💡 Debes inicializar el sistema creando el primer usuario');
            return;
        }
        
        // 2. Obtener todos los usuarios con sus datos
        const users = await prisma.user.findMany({
            include: {
                profile: true,
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });
        
        console.log('👥 Usuarios encontrados:\n');
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.profile?.fullName || 'Sin nombre'}`);
            console.log(`   🆔 ID: ${user.id}`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   🎭 Roles: ${user.roles.map(r => r.role.name).join(', ')}`);
            console.log(`   🔐 MustChangePassword: ${user.mustChangePassword ? 'SÍ' : 'NO'}`);
            console.log(`   📱 Teléfono: ${user.phone || 'N/A'}`);
            console.log(`   📋 Sexo: ${user.profile?.sex || 'N/A'}`);
            console.log(`   🏠 Dirección: ${user.profile?.address || 'N/A'}`);
            console.log(`   🏙️ Ciudad: ${user.profile?.city || 'N/A'}`);
            console.log('');
        });
        
        // 3. Buscar específicamente a eulaliaianunez@gmail.com
        console.log('🎯 Buscando específicamente a eulaliaianunez@gmail.com...');
        const targetUser = users.find(u => u.email === 'eulaliaianunez@gmail.com');
        
        if (targetUser) {
            console.log('✅ Usuario encontrado:');
            console.log(`   🆔 ID: ${targetUser.id}`);
            console.log(`   👤 Nombre: ${targetUser.profile?.fullName}`);
            console.log(`   🎭 Roles: ${targetUser.roles.map(r => r.role.name).join(', ')}`);
            console.log(`   🔐 MustChangePassword: ${targetUser.mustChangePassword ? 'SÍ' : 'NO'}`);
            console.log(`   📱 Teléfono: ${targetUser.phone || 'N/A'}`);
            console.log(`   📋 Sexo: ${targetUser.profile?.sex}`);
            console.log(`   🏠 Dirección: ${targetUser.profile?.address}`);
            console.log(`   🏙️ Ciudad: ${targetUser.profile?.city}`);
            console.log(`   🔑 HasPassword: ${!!targetUser.password}`);
            console.log(`   🔑 PasswordHashLength: ${targetUser.password?.length || 0}`);
            
            // 4. Probar el proceso de hash con la contraseña específica
            console.log('\n🧪 Probando proceso de hash con la contraseña @ZgrP+X7Y_2#...');
            const bcrypt = require('bcryptjs');
            const testPassword = '@ZgrP+X7Y_2#';
            
            try {
                // Hash de prueba
                const testHash = await bcrypt.hash(testPassword, 10);
                console.log(`✅ Hash de prueba generado: ${testHash.substring(0, 20)}...`);
                
                // Verificar contra el hash existente
                const isMatch = await bcrypt.compare(testPassword, targetUser.password);
                console.log(`🔍 ¿Contraseña actual coincide con @ZgrP+X7Y_2#?: ${isMatch ? 'SÍ' : 'NO'}`);
                
                // Si no coincide, mostrar el hash actual
                if (!isMatch) {
                    console.log(`📝 Hash actual en BD: ${targetUser.password.substring(0, 20)}...`);
                    console.log('💡 La contraseña actual es diferente. Necesita hacer reset.');
                }
                
                // Simular el proceso de reset
                console.log('\n🔄 Simulando proceso de reset...');
                const newHash = await bcrypt.hash(testPassword, 10);
                console.log(`✅ Nuevo hash generado: ${newHash.substring(0, 20)}...`);
                
                const wouldMatch = await bcrypt.compare(testPassword, newHash);
                console.log(`🔍 ¿Nuevo hash funcionaría?: ${wouldMatch ? 'SÍ' : 'NO'}`);
                
            } catch (hashError) {
                console.log('❌ Error en proceso de hash:', hashError.message);
            }
            
        } else {
            console.log('❌ Usuario eulaliaianunez@gmail.com NO encontrado en la base de datos');
            console.log('💡 Verifica si:');
            console.log('   1. El email está escrito correctamente');
            console.log('   2. El usuario existe con otro email');
            console.log('   3. El usuario necesita ser creado');
        }
        
        // 5. Encontrar usuarios admin para poder hacer pruebas
        console.log('\n👑 Buscando usuarios con rol ADMIN...');
        const adminUsers = users.filter(u => u.roles.some(r => r.role.name === 'ADMIN'));
        
        if (adminUsers.length > 0) {
            console.log('✅ Usuarios ADMIN encontrados:');
            adminUsers.forEach((admin, i) => {
                console.log(`   ${i + 1}. ${admin.profile?.fullName} (${admin.email})`);
                console.log(`      🆔 ID: ${admin.id}`);
                console.log(`      🔐 MustChangePassword: ${admin.mustChangePassword ? 'SÍ' : 'NO'}`);
            });
            
            console.log('\n💡 Puedes usar estas credenciales para hacer pruebas:');
            console.log('   Actualiza el script find-users.js con uno de estos emails y su contraseña');
            
        } else {
            console.log('❌ No se encontraron usuarios con rol ADMIN');
            console.log('💡 Esto es inusual. Debe haber al menos un usuario admin en el sistema');
        }
        
    } catch (error) {
        console.error('❌ Error consultando la base de datos:', error);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Error de conexión a la base de datos.');
            console.log('   Verifica que PostgreSQL esté corriendo y la conexión sea correcta');
            console.log('   DATABASE_URL:', process.env.DATABASE_URL);
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar consulta
if (require.main === module) {
    findUsersInDB().catch(console.error);
}

module.exports = { findUsersInDB };
