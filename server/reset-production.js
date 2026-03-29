// Script para resetear la contraseña de Eulalia en producción
const axios = require('axios');

const PROD_API_URL = 'https://proyecto-mci-production.up.railway.app/api';
const TARGET_EMAIL = 'eulaliaianunez@gmail.com';
const NEW_PASSWORD = '@ZgrP+X7Y_2#';

async function resetPasswordInProduction() {
    console.log('🔄 Reseteando contraseña en producción...\n');
    console.log(`🌐 URL: ${PROD_API_URL}`);
    console.log(`📧 Email: ${TARGET_EMAIL}`);
    console.log(`🔐 Nueva contraseña: ${NEW_PASSWORD}\n`);

    let adminToken = null;

    try {
        // 1. Intentar login como admin (necesitamos credenciales válidas)
        console.log('👑 Intentando login como admin...');
        
        // Estas credenciales deben ser las del admin real en producción
        const adminCredentials = [
            { email: 'usuarioadmin@gmail.com', password: 'Admin123!' },
            { email: 'admin@mci.com', password: 'Admin123!' },
            { email: 'admin@test.com', password: 'Admin123!' },
        ];

        for (const cred of adminCredentials) {
            try {
                console.log(`   Intentando: ${cred.email}...`);
                const response = await axios.post(`${PROD_API_URL}/auth/login`, cred);
                adminToken = response.data.token;
                console.log('✅ Login como admin exitoso\n');
                break;
            } catch (error) {
                console.log(`   ❌ Falló: ${cred.email}`);
            }
        }

        if (!adminToken) {
            console.log('❌ No se pudo obtener token de admin');
            console.log('💡 Necesitas las credenciales correctas del admin en producción');
            console.log('   Por favor, actualiza las credenciales en este script\n');
            return;
        }

        // 2. Obtener lista de usuarios para encontrar el ID de Eulalia
        console.log('👥 Buscando usuario Eulalia...');
        try {
            const usersResponse = await axios.get(`${PROD_API_URL}/users`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            
            const users = usersResponse.data;
            const targetUser = users.find(u => u.email === TARGET_EMAIL);
            
            if (!targetUser) {
                console.log(`❌ Usuario ${TARGET_EMAIL} no encontrado en producción`);
                console.log('📋 Usuarios disponibles:');
                users.slice(0, 10).forEach((u, i) => {
                    console.log(`   ${i+1}. ${u.fullName} (${u.email})`);
                });
                if (users.length > 10) {
                    console.log(`   ... y ${users.length - 10} más`);
                }
                return;
            }
            
            console.log('✅ Usuario encontrado:');
            console.log(`   ID: ${targetUser.id}`);
            console.log(`   Nombre: ${targetUser.fullName}`);
            console.log(`   Roles: ${targetUser.roles.join(', ')}`);
            console.log(`   MustChangePassword: ${targetUser.mustChangePassword ? 'SÍ' : 'NO'}\n`);

            // 3. Ejecutar el reset de contraseña
            console.log('🔄 Ejecutando reset de contraseña...');
            try {
                const resetResponse = await axios.post(
                    `${PROD_API_URL}/auth/force-password-change/${targetUser.id}`,
                    { newTempPassword: NEW_PASSWORD },
                    { headers: { 'Authorization': `Bearer ${adminToken}` } }
                );
                
                console.log('✅ Reset ejecutado exitosamente:');
                console.log(`   ${resetResponse.data.message}\n`);
                
                // 4. Verificar el login inmediatamente
                console.log('🔑 Verificando login con la nueva contraseña...');
                try {
                    const loginResponse = await axios.post(`${PROD_API_URL}/auth/login`, {
                        email: TARGET_EMAIL,
                        password: NEW_PASSWORD
                    });
                    
                    console.log('✅ Login exitoso con la nueva contraseña!');
                    console.log('📊 Detalles:');
                    console.log(`   UserID: ${loginResponse.data.user.id}`);
                    console.log(`   Nombre: ${loginResponse.data.user.fullName}`);
                    console.log(`   MustChangePassword: ${loginResponse.data.user.mustChangePassword ? 'SÍ' : 'NO'}`);
                    console.log(`   Roles: ${loginResponse.data.user.roles.join(', ')}`);
                    
                    if (loginResponse.data.user.mustChangePassword) {
                        console.log('\n✅ Perfecto: El usuario debe cambiar la contraseña');
                        console.log('🔄 El usuario será redirigido al modal de cambio de contraseña');
                    }
                    
                } catch (loginError) {
                    console.log('❌ Falló el login después del reset');
                    console.log('Error:', loginError.response?.data || loginError.message);
                }
                
            } catch (resetError) {
                console.log('❌ Error en el reset');
                console.log('Error:', resetError.response?.data || resetError.message);
                
                if (resetError.response?.status === 403) {
                    console.log('💡 Posible causa: El admin no tiene permisos para resetear este usuario');
                }
            }
            
        } catch (usersError) {
            console.log('❌ Error obteniendo usuarios:', usersError.response?.data || usersError.message);
        }

    } catch (error) {
        console.error('❌ Error general:', error.message);
    }
}

// Ejecutar reset
if (require.main === module) {
    resetPasswordInProduction().catch(console.error);
}

module.exports = { resetPasswordInProduction };
