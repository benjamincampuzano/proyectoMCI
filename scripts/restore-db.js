const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cargar variables de entorno desde .env
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

// Función para restaurar la base de datos desde un archivo SQL
function restoreDatabase(backupFilePath) {
    try {
        // Verificar que el archivo existe
        if (!fs.existsSync(backupFilePath)) {
            console.error('❌ El archivo de backup no existe:', backupFilePath);
            process.exit(1);
        }

        console.log('🔄 Iniciando restauración de la base de datos...');
        console.log('📁 Archivo de backup:', backupFilePath);

        // Leer variables de entorno
        const databaseUrl = process.env.DATABASE_URL || process.env.PG_DUMP_URL;
        
        if (!databaseUrl) {
            console.error('❌ No se encontró DATABASE_URL o PG_DUMP_URL en las variables de entorno');
            process.exit(1);
        }

        console.log('🔗 Conectando a la base de datos...');

        // Extraer información de conexión de la URL
        const url = new URL(databaseUrl);
        const host = url.hostname;
        const port = url.port || 5432;
        const database = url.pathname.substring(1); // Eliminar el /
        const username = url.username;
        const password = url.password;

        // Construir URL limpia sin parámetros que psql no acepta
        const cleanUrl = `postgresql://${username}:${password}@${host}:${port}/${database}`;

        console.log(`📊 Base de datos: ${database}`);
        console.log(`🖥️  Host: ${host}:${port}`);

        // Construir comando psql
        const psqlCommand = `psql "${cleanUrl}" -f "${backupFilePath}"`;

        console.log('⚡ Ejecutando comando de restauración...');

        // Ejecutar el comando
        const output = execSync(psqlCommand, { 
            encoding: 'utf8',
            stdio: 'pipe',
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });

        console.log('✅ Restauración completada exitosamente');
        console.log('📄 Salida del comando:');
        console.log(output);

        // Verificar que los usuarios se restauraron
        console.log('\n🔍 Verificando usuarios restaurados...');
        const checkUsersCommand = `psql "${cleanUrl}" -c "SELECT COUNT(*) as total_users FROM \"User\";"`;
        const userCount = execSync(checkUsersCommand, { encoding: 'utf8' });
        console.log('👥 Usuarios totales:', userCount);

        // Mostrar algunos usuarios de ejemplo
        const sampleUsersCommand = `psql "${cleanUrl}" -c "SELECT id, email, \"isActive\" FROM \"User\" LIMIT 5;"`;
        const sampleUsers = execSync(sampleUsersCommand, { encoding: 'utf8' });
        console.log('📋 Ejemplo de usuarios:');
        console.log(sampleUsers);

    } catch (error) {
        console.error('❌ Error durante la restauración:');
        console.error(error.message);
        
        if (error.stdout) {
            console.error('📄 Salida estándar:');
            console.error(error.stdout);
        }
        
        if (error.stderr) {
            console.error('📄 Salida de error:');
            console.error(error.stderr);
        }
        
        process.exit(1);
    }
}

// Obtener el archivo de backup de los argumentos
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('❌ Debes especificar la ruta al archivo de backup');
    console.error('Uso: node restore-db.js <ruta-al-backup.sql>');
    process.exit(1);
}

const backupFilePath = args[0];

// Si la ruta es relativa, convertirla a absoluta
const absoluteBackupPath = path.isAbsolute(backupFilePath) 
    ? backupFilePath 
    : path.resolve(process.cwd(), backupFilePath);

console.log('🚀 Script de restauración de base de datos');
console.log('=====================================');

restoreDatabase(absoluteBackupPath);
