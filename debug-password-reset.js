// Script simple para verificar el problema de reset de contraseña
// Ejecutar con: node debug-password-reset.js

const bcrypt = require('bcryptjs');

// Simular el proceso de generación y hash de contraseñas
function simulatePasswordProcess() {
    console.log('🔍 Simulando el proceso de reset de contraseña...\n');

    // 1. Generar contraseña como lo hace el frontend
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

    // 2. Generar una contraseña de prueba
    const testPassword = generateTempPassword();
    console.log(`🔐 Contraseña generada: ${testPassword}`);
    console.log(`📏 Longitud: ${testPassword.length}`);

    // 3. Validar la contraseña
    const hasUpper = /[A-Z]/.test(testPassword);
    const hasLower = /[a-z]/.test(testPassword);
    const hasNumbers = /\d/.test(testPassword);
    const hasSymbols = /[!@#$%^&*+-_]/.test(testPassword);
    
    console.log('\n✅ Validación de contraseña:');
    console.log(`  - Mayúsculas: ${hasUpper ? 'SÍ' : 'NO'}`);
    console.log(`  - Minúsculas: ${hasLower ? 'SÍ' : 'NO'}`);
    console.log(`  - Números: ${hasNumbers ? 'SÍ' : 'NO'}`);
    console.log(`  - Símbolos: ${hasSymbols ? 'SÍ' : 'NO'}`);
    console.log(`  - Válida: ${hasUpper && hasLower && hasNumbers && hasSymbols ? 'SÍ' : 'NO'}`);

    // 4. Simular el proceso de hash (como lo hace el backend)
    const hashPassword = async () => {
        try {
            console.log('\n🔐 Hasheando contraseña...');
            const hashedPassword = await bcrypt.hash(testPassword, 10);
            console.log(`✅ Hash generado: ${hashedPassword.substring(0, 20)}...`);
            
            // 5. Simular el proceso de verificación (como lo hace el login)
            console.log('\n🔍 Verificando contraseña...');
            const isMatch = await bcrypt.compare(testPassword, hashedPassword);
            console.log(`✅ Verificación: ${isMatch ? 'EXITOSA' : 'FALLÓ'}`);
            
            // 6. Probar con variaciones para detectar problemas
            console.log('\n🧪 Probando variaciones...');
            
            // Probar con espacios extra
            const withSpace = testPassword + ' ';
            const isMatchWithSpace = await bcrypt.compare(withSpace, hashedPassword);
            console.log(`  - Con espacio extra: ${isMatchWithSpace ? 'EXITOSA' : 'FALLÓ'}`);
            
            // Probar sin último caracter
            const withoutLast = testPassword.slice(0, -1);
            const isMatchWithoutLast = await bcrypt.compare(withoutLast, hashedPassword);
            console.log(`  - Sin último caracter: ${isMatchWithoutLast ? 'EXITOSA' : 'FALLÓ'}`);
            
            // Probar con mayúsculas/minúsculas cambiadas
            const upperCase = testPassword.toUpperCase();
            const isMatchUpperCase = await bcrypt.compare(upperCase, hashedPassword);
            console.log(`  - Todo mayúsculas: ${isMatchUpperCase ? 'EXITOSA' : 'FALLÓ'}`);
            
            return { testPassword, hashedPassword, isMatch };
        } catch (error) {
            console.error('❌ Error en el proceso:', error);
            return null;
        }
    };

    return hashPassword();
}

// Ejecutar la simulación
simulatePasswordProcess().then(result => {
    if (result && result.isMatch) {
        console.log('\n🎉 El proceso de hash/verificación funciona correctamente');
        console.log('💡 El problema podría estar en:');
        console.log('   1. La comunicación entre frontend y backend');
        console.log('   2. La base de datos no se está actualizando correctamente');
        console.log('   3. El usuario está usando una contraseña diferente');
        console.log('   4. Problemas de encoding en la transmisión');
    } else {
        console.log('\n❌ Hay un problema en el proceso de hash/verificación');
    }
}).catch(console.error);
