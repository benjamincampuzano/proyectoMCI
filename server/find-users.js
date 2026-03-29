// Script para encontrar usuarios existentes en el sistema
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

async function findExistingUsers() {
    console.log('🔍 Buscando usuarios existentes en el sistema...\n');

    try {
        // 1. Verificar si el sistema está inicializado
        console.log('🏥 Verificando estado del sistema...');
        const initStatus = await axios.get(`${API_BASE_URL}/api/auth/init-status`);
        console.log(`✅ Sistema inicializado: ${initStatus.data.isInitialized ? 'SÍ' : 'NO'}\n`);

        if (!initStatus.data.isInitialized) {
            console.log('💡 El sistema no está inicializado. Debes crear el primer usuario admin.');
            console.log('   Ve a: http://localhost:5173/register (ajusta el puerto si es necesario)');
            return;
        }

        // 2. Intentar login con credenciales comunes
        console.log('🔑 Intentando login con credenciales comunes...');
        const commonCredentials = [
            { email: 'admin@mci.com', password: 'Admin123!' },
            { email: 'admin@test.com', password: 'Admin123!' },
            { email: 'admin@example.com', password: 'Admin123!' },
            { email: 'test@test.com', password: 'Test123!' },
            { email: 'user@test.com', password: 'User123!' },
        ];

        let adminToken = null;
        let loggedInUser = null;

        for (const cred of commonCredentials) {
            try {
                console.log(`   Intentando: ${cred.email}...`);
                const response = await axios.post(`${API_BASE_URL}/api/auth/login`, cred);
                adminToken = response.data.token;
                loggedInUser = response.data.user;
                console.log(`✅ Login exitoso con: ${cred.email}`);
                console.log(`   Usuario: ${loggedInUser.fullName}`);
                console.log(`   Roles: ${loggedInUser.roles.join(', ')}\n`);
                break;
            } catch (error) {
                console.log(`   ❌ Falló: ${cred.email}`);
            }
        }

        if (!adminToken) {
            console.log('❌ No se encontraron credenciales válidas');
            console.log('💡 Necesitas conocer las credenciales de un usuario admin existente');
            console.log('   O verificar qué usuarios existen en la base de datos directamente\n');
            return;
        }

        // 3. Obtener lista de todos los usuarios
        console.log('👥 Obteniendo lista de todos los usuarios...');
        try {
            const usersResponse = await axios.get(`${API_BASE_URL}/api/users`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            
            const users = usersResponse.data;
            console.log(`✅ Se encontraron ${users.length} usuarios:\n`);

            users.forEach((user, index) => {
                console.log(`${index + 1}. ${user.fullName}`);
                console.log(`   📧 Email: ${user.email}`);
                console.log(`   🆔 ID: ${user.id}`);
                console.log(`   🎭 Roles: ${user.roles.join(', ')}`);
                console.log(`   🔐 MustChangePassword: ${user.mustChangePassword ? 'SÍ' : 'NO'}`);
                console.log(`   📱 Teléfono: ${user.phone || 'N/A'}`);
                console.log('');
            });

            // 4. Buscar específicamente a eulaliaianunez@gmail.com
            console.log('🎯 Buscando específicamente a eulaliaianunez@gmail.com...');
            const targetUser = users.find(u => u.email === 'eulaliaianunez@gmail.com');
            
            if (targetUser) {
                console.log('✅ Usuario encontrado:');
                console.log(`   🆔 ID: ${targetUser.id}`);
                console.log(`   👤 Nombre: ${targetUser.fullName}`);
                console.log(`   🎭 Roles: ${targetUser.roles.join(', ')}`);
                console.log(`   🔐 MustChangePassword: ${targetUser.mustChangePassword ? 'SÍ' : 'NO'}`);
                console.log(`   📱 Teléfono: ${targetUser.phone || 'N/A'}`);
                
                // 5. Probar reset con este usuario
                console.log('\n🔄 Probando reset de contraseña para este usuario...');
                try {
                    const testPassword = '@ZgrP+X7Y_2#';
                    const resetResponse = await axios.post(
                        `${API_BASE_URL}/api/auth/force-password-change/${targetUser.id}`,
                        { newTempPassword: testPassword },
                        { headers: { 'Authorization': `Bearer ${adminToken}` } }
                    );
                    console.log('✅ Reset ejecutado:', resetResponse.data.message);
                    
                    // 6. Probar login inmediatamente
                    console.log('\n🔑 Probando login con la contraseña reseteada...');
                    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
                        email: 'eulaliaianunez@gmail.com',
                        password: testPassword
                    });
                    
                    console.log('✅ Login exitoso!');
                    console.log(`   Usuario: ${loginResponse.data.user.fullName}`);
                    console.log(`   MustChangePassword: ${loginResponse.data.user.mustChangePassword ? 'SÍ' : 'NO'}`);
                    console.log(`   Roles: ${loginResponse.data.user.roles.join(', ')}`);
                    
                } catch (error) {
                    console.log('❌ Error en el proceso:', error.response?.data || error.message);
                }
                
            } else {
                console.log('❌ Usuario eulaliaianunez@gmail.com NO encontrado');
                console.log('💡 Verifica si el email está escrito correctamente');
                console.log('   O si el usuario necesita ser creado primero');
            }

        } catch (error) {
            console.log('❌ Error obteniendo usuarios:', error.response?.data || error.message);
        }

    } catch (error) {
        console.error('❌ Error general:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 El servidor no está corriendo. Inicia el servidor con:');
            console.log('   cd server && npm run dev');
        }
    }
}

// Ejecutar búsqueda
if (require.main === module) {
    findExistingUsers().catch(console.error);
}

module.exports = { findExistingUsers };
