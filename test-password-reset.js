const axios = require('axios');
const bcrypt = require('bcryptjs');

// Configuración para conectar al servidor local
const API_BASE_URL = 'http://localhost:3001'; // Ajusta según tu configuración

// Función para probar el reset de contraseña
async function testPasswordReset() {
    console.log('🧪 Iniciando prueba de reset de contraseña...\n');

    try {
        // 1. Primero, hacer login como admin para obtener token
        console.log('📝 1. Haciendo login como admin...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@test.com', // Reemplaza con email de admin real
            password: 'admin123' // Reemplaza con contraseña de admin real
        });

        const adminToken = loginResponse.data.token;
        console.log('✅ Login exitoso como admin');

        // 2. Obtener lista de usuarios
        console.log('\n📋 2. Obteniendo lista de usuarios...');
        const usersResponse = await axios.get(`${API_BASE_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        const users = usersResponse.data;
        console.log(`✅ Se encontraron ${users.length} usuarios`);

        // 3. Seleccionar un usuario de prueba (no admin)
        const testUser = users.find(u => !u.roles.includes('ADMIN') && u.email !== 'admin@test.com');
        if (!testUser) {
            console.log('❌ No se encontró un usuario de prueba válido');
            return;
        }

        console.log(`\n👤 3. Usuario seleccionado para prueba: ${testUser.fullName} (${testUser.email})`);

        // 4. Generar una contraseña temporal de prueba
        const testPassword = 'Test123!@#';
        console.log(`\n🔐 4. Contraseña temporal de prueba: ${testPassword}`);

        // 5. Ejecutar el reset de contraseña
        console.log('\n🔄 5. Ejecutando reset de contraseña...');
        const resetResponse = await axios.post(
            `${API_BASE_URL}/auth/force-password-change/${testUser.id}`,
            {
                newTempPassword: testPassword
            },
            {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            }
        );

        console.log('✅ Reset ejecutado:', resetResponse.data.message);

        // 6. Intentar login con la nueva contraseña
        console.log('\n🔑 6. Intentando login con la contraseña temporal...');
        try {
            const testLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
                email: testUser.email,
                password: testPassword
            });

            console.log('✅ Login exitoso con contraseña temporal');
            console.log('📊 Respuesta:', {
                userId: testLoginResponse.data.user.id,
                fullName: testLoginResponse.data.user.fullName,
                mustChangePassword: testLoginResponse.data.user.mustChangePassword,
                roles: testLoginResponse.data.user.roles
            });

            if (testLoginResponse.data.user.mustChangePassword) {
                console.log('✅ El flag mustChangePassword está activado correctamente');
            } else {
                console.log('❌ El flag mustChangePassword no está activado');
            }

        } catch (loginError) {
            console.log('❌ Falló el login con contraseña temporal');
            console.log('Error:', loginError.response?.data || loginError.message);
        }

        // 7. Verificar que la contraseña fue hasheada correctamente
        console.log('\n🔍 7. Verificando hash en base de datos...');
        // Esto requeriría acceso directo a la base de datos, pero podemos inferirlo por el resultado del login

    } catch (error) {
        console.error('❌ Error en la prueba:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('💡 Sugerencia: Verifica que las credenciales de admin sean correctas');
        } else if (error.response?.status === 403) {
            console.log('💡 Sugerencia: Verifica que el usuario admin tenga permisos suficientes');
        } else if (error.response?.status === 404) {
            console.log('💡 Sugerencia: Verifica que el servidor esté corriendo y la URL sea correcta');
        }
    }
}

// Función para probar la generación de contraseñas (simulación del frontend)
function testPasswordGeneration() {
    console.log('\n🔐 Probando generación de contraseñas (simulación frontend)...');
    
    const generateTempPassword = () => {
        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const nums = '0123456789';
        const syms = '!@#$%^&*+-_';
        const all = upper + lower + nums + syms;
        
        let tempPass = '';
        tempPass += upper.charAt(Math.floor(Math.random() * upper.length));
        tempPass += lower.charAt(Math.floor(Math.random() * lower.length));
        tempPass += nums.charAt(Math.floor(Math.random() * nums.length));
        tempPass += syms.charAt(Math.floor(Math.random() * syms.length));
        
        for (let i = 0; i < 8; i++) {
            tempPass += all.charAt(Math.floor(Math.random() * all.length));
        }
        
        return tempPass.split('').sort(() => 0.5 - Math.random()).join('');
    };

    for (let i = 0; i < 5; i++) {
        const password = generateTempPassword();
        console.log(`Contraseña ${i + 1}: ${password} (longitud: ${password.length})`);
        
        // Validar que cumple los criterios
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSymbols = /[!@#$%^&*+-_]/.test(password);
        
        console.log(`  - Mayúsculas: ${hasUpper ? '✅' : '❌'}`);
        console.log(`  - Minúsculas: ${hasLower ? '✅' : '❌'}`);
        console.log(`  - Números: ${hasNumbers ? '✅' : '❌'}`);
        console.log(`  - Símbolos: ${hasSymbols ? '✅' : '❌'}`);
        console.log(`  - Válida: ${hasUpper && hasLower && hasNumbers && hasSymbols ? '✅' : '❌'}`);
        console.log('');
    }
}

// Ejecutar las pruebas
async function runTests() {
    console.log('🚀 Iniciando suite de pruebas para reset de contraseñas\n');
    
    // Probar generación de contraseñas
    testPasswordGeneration();
    
    // Probar flujo completo (requiere servidor corriendo)
    await testPasswordReset();
    
    console.log('\n🏁 Pruebas completadas');
}

// Ejecutar si se llama directamente
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testPasswordReset, testPasswordGeneration };
