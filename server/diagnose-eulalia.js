// Script específico para diagnosticar el problema con eulaliaianunez@gmail.com
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'eulaliaianunez@gmail.com';
const TEST_PASSWORD = '@ZgrP+X7Y_2#';

async function diagnoseSpecificUser() {
    console.log('🔍 Diagnosticando problema específico...\n');
    console.log(`📧 Email: ${TEST_EMAIL}`);
    console.log(`🔐 Password: ${TEST_PASSWORD}`);
    console.log(`📏 Password length: ${TEST_PASSWORD.length}\n`);

    try {
        // 1. Primero verificar si el servidor está corriendo
        console.log('🏥 Verificando estado del servidor...');
        try {
            await axios.get(`${API_BASE_URL}/api/auth/init-status`);
            console.log('✅ Servidor está corriendo\n');
        } catch (error) {
            console.log('❌ Servidor no está corriendo o no es accesible');
            return;
        }

        // 2. Intentar login como admin para obtener token
        console.log('👑 Intentando login como admin...');
        let adminToken;
        try {
            const adminLogin = await axios.post(`${API_BASE_URL}/api/auth/login`, {
                email: 'admin@test.com', // <-- CAMBIA ESTO
                password: 'Admin123!'    // <-- CAMBIA ESTO
            });
            adminToken = adminLogin.data.token;
            console.log('✅ Login como admin exitoso\n');
        } catch (error) {
            console.log('❌ Falló login como admin. Usando credenciales por defecto...');
            console.log('💡 Por favor, actualiza las credenciales de admin en este script\n');
            return;
        }

        // 3. Buscar el usuario específico
        console.log(`👤 Buscando usuario: ${TEST_EMAIL}...`);
        let users;
        try {
            const usersResponse = await axios.get(`${API_BASE_URL}/api/users`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            users = usersResponse.data;
            
            const targetUser = users.find(u => u.email === TEST_EMAIL);
            if (!targetUser) {
                console.log(`❌ Usuario ${TEST_EMAIL} no encontrado`);
                console.log('📋 Usuarios disponibles:');
                users.forEach((u, i) => console.log(`  ${i+1}. ${u.email}`));
                return;
            }
            
            console.log('✅ Usuario encontrado:');
            console.log(`   ID: ${targetUser.id}`);
            console.log(`   Nombre: ${targetUser.fullName}`);
            console.log(`   Roles: ${targetUser.roles.join(', ')}`);
            console.log(`   MustChangePassword: ${targetUser.mustChangePassword}\n`);
            
        } catch (error) {
            console.log('❌ Error obteniendo usuarios:', error.response?.data || error.message);
            return;
        }

        // 4. Probar reset de contraseña con la contraseña específica
        console.log('🔄 Ejecutando reset de contraseña...');
        try {
            const targetUser = users.find(u => u.email === TEST_EMAIL);
            const resetResponse = await axios.post(
                `${API_BASE_URL}/api/auth/force-password-change/${targetUser.id}`,
                { newTempPassword: TEST_PASSWORD },
                { headers: { 'Authorization': `Bearer ${adminToken}` } }
            );
            console.log('✅ Reset ejecutado:', resetResponse.data.message);
        } catch (error) {
            console.log('❌ Error en reset:', error.response?.data || error.message);
            console.log('💡 Revisa los logs del servidor para más detalles\n');
            return;
        }

        // 5. Intentar login con la contraseña reseteada
        console.log('\n🔑 Intentando login con contraseña reseteada...');
        try {
            const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            });
            
            console.log('✅ Login exitoso!');
            console.log('📊 Detalles de la respuesta:');
            console.log(`   UserID: ${loginResponse.data.user.id}`);
            console.log(`   FullName: ${loginResponse.data.user.fullName}`);
            console.log(`   MustChangePassword: ${loginResponse.data.user.mustChangePassword}`);
            console.log(`   Roles: ${loginResponse.data.user.roles.join(', ')}`);
            
            if (loginResponse.data.user.mustChangePassword) {
                console.log('✅ El flag mustChangePassword está activado correctamente');
            } else {
                console.log('⚠️  El flag mustChangePassword no está activado');
            }
            
        } catch (loginError) {
            console.log('❌ Falló el login con contraseña reseteada');
            console.log('🔍 Error detallado:', loginError.response?.data || loginError.message);
            
            if (loginError.response?.status === 401) {
                console.log('\n🔍 Análisis del error 401:');
                console.log('   - Las credenciales son incorrectas');
                console.log('   - Esto indica que:');
                console.log('     1. La contraseña no se guardó correctamente en la BD');
                console.log('     2. Hay un problema en el proceso de hash/verificación');
                console.log('     3. La contraseña se corrompió en la transmisión');
            }
        }

        // 6. Verificar el estado actual del usuario
        console.log('\n🔍 Verificando estado actual del usuario...');
        try {
            const targetUser = users.find(u => u.email === TEST_EMAIL);
            const userStatus = await axios.get(`${API_BASE_URL}/api/users/${targetUser.id}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            
            console.log('📊 Estado actual del usuario:');
            console.log(`   ID: ${userStatus.data.id}`);
            console.log(`   Email: ${userStatus.data.email}`);
            console.log(`   HasPassword: ${!!userStatus.data.password}`);
            console.log(`   PasswordHashLength: ${userStatus.data.password?.length || 0}`);
            console.log(`   MustChangePassword: ${userStatus.data.mustChangePassword}`);
            
        } catch (error) {
            console.log('❌ Error verificando estado del usuario:', error.response?.data || error.message);
        }

    } catch (error) {
        console.error('❌ Error general:', error.message);
    }
}

// Función para validar la contraseña específica
function validateSpecificPassword() {
    console.log('\n🔍 Validando la contraseña específica...');
    
    const password = TEST_PASSWORD;
    console.log(`Contraseña: ${password}`);
    console.log(`Longitud: ${password.length}`);
    
    // Validar caracteres
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSymbols = /[!@#$%^&*+\-_]/.test(password);
    
    console.log('\nValidación:');
    console.log(`  - Mayúsculas: ${hasUpper ? '✅' : '❌'} ${password.match(/[A-Z]/g)?.join(', ') || 'Ninguna'}`);
    console.log(`  - Minúsculas: ${hasLower ? '✅' : '❌'} ${password.match(/[a-z]/g)?.join(', ') || 'Ninguna'}`);
    console.log(`  - Números: ${hasNumbers ? '✅' : '❌'} ${password.match(/\d/g)?.join(', ') || 'Ninguno'}`);
    console.log(`  - Símbolos: ${hasSymbols ? '✅' : '❌'} ${password.match(/[!@#$%^&*+\-_]/g)?.join(', ') || 'Ninguno'}`);
    console.log(`  - Válida: ${hasUpper && hasLower && hasNumbers && hasSymbols ? '✅' : '❌'}`);
    
    // Analizar caracteres especiales
    console.log('\nAnálisis de caracteres:');
    for (let i = 0; i < password.length; i++) {
        const char = password[i];
        const code = char.charCodeAt(0);
        console.log(`  [${i}] "${char}" (ASCII: ${code}) - ${code < 32 ? 'Control' : code < 127 ? 'Normal' : 'Unicode'}`);
    }
}

// Ejecutar diagnóstico
async function runDiagnosis() {
    console.log('🚀 Iniciando diagnóstico específico para eulaliaianunez@gmail.com\n');
    
    // Validar la contraseña primero
    validateSpecificPassword();
    
    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Probar con la API
    await diagnoseSpecificUser();
    
    console.log('\n🏁 Diagnóstico completado');
    console.log('\n💡 Si el login falla, revisa los logs del servidor que iniciamos en background');
}

// Ejecutar si se llama directamente
if (require.main === module) {
    runDiagnosis().catch(console.error);
}

module.exports = { diagnoseSpecificUser, validateSpecificPassword };
