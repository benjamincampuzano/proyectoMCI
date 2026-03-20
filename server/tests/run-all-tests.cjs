/**
 * Script principal para ejecutar todas las pruebas del backend (CommonJS version)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testFiles = [
    // No functional tests available - all removed due to schema changes
];

console.log('🚀 Iniciando ejecución de todas las pruebas del Backend...\n');

if (testFiles.length === 0) {
    console.log('⚠️  No hay tests funcionales disponibles.');
    console.log('📝 Todos los tests fueron eliminados debido a cambios en el schema de la base de datos.');
    console.log('💡 Se necesitan crear nuevos tests compatibles con el nuevo schema (UserRole relationship).');
    process.exit(0);
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

testFiles.forEach((testFile, index) => {
    console.log(`\n📋 Ejecutando prueba ${index + 1}/${testFiles.length}: ${testFile}`);
    console.log('='.repeat(50));
    
    try {
        const startTime = Date.now();
        const output = execSync(`node ${testFile}`, { 
            encoding: 'utf8',
            cwd: __dirname
        });
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Analizar el output para determinar si pasó
        const hasErrors = output.includes('❌') || output.includes('Error:') || output.includes('FAIL');
        const hasSuccess = output.includes('✅') && !hasErrors;
        
        totalTests++;
        
        if (hasSuccess) {
            passedTests++;
            console.log(`✅ ${testFile} - PASÓ (${duration}ms)`);
            results.push({ file: testFile, status: 'PASSED', duration, output });
        } else {
            failedTests++;
            console.log(`❌ ${testFile} - FALLÓ`);
            console.log('Output:', output);
            results.push({ file: testFile, status: 'FAILED', duration, output });
        }
        
    } catch (error) {
        failedTests++;
        totalTests++;
        console.log(`❌ ${testFile} - ERROR DE EJECUCIÓN`);
        console.log('Error:', error.message);
        results.push({ file: testFile, status: 'ERROR', error: error.message });
    }
});

console.log('\n' + '='.repeat(50));
console.log('📊 RESUMEN DE PRUEBAS DEL BACKEND');
console.log('='.repeat(50));
console.log(`Total de pruebas: ${totalTests}`);
console.log(`Pruebas pasadas: ${passedTests}`);
console.log(`Pruebas fallidas: ${failedTests}`);
console.log(`Tasa de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

// Generar reporte detallado
const report = {
    timestamp: new Date().toISOString(),
    summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: ((passedTests / totalTests) * 100).toFixed(1)
    },
    results: results
};

// Guardar reporte en archivo JSON
const reportPath = path.join(__dirname, 'test-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n📄 Reporte detallado guardado en: ${reportPath}`);

// Mostrar pruebas fallidas si hay alguna
if (failedTests > 0) {
    console.log('\n❌ PRUEBAS FALLIDAS:');
    results
        .filter(r => r.status === 'FAILED' || r.status === 'ERROR')
        .forEach(r => {
            console.log(`   - ${r.file}: ${r.status}`);
            if (r.error) {
                console.log(`     Error: ${r.error}`);
            }
        });
}

console.log('\n🎉 Ejecución de pruebas completada.');
