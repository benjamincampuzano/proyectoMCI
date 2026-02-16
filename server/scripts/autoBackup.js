const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

const uploadToDrive = require('./driveUpload');

// Función principal de backup automático
async function performDailyBackup() {
  try {
    console.log('🚀 Iniciando backup automático diario:', new Date().toISOString());
    
    // 1. Crear directorio de backups si no existe
    const backupsDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // 2. Generar nombre de archivo con timestamp
    const fileName = `backup_auto_${new Date().toISOString().replace(/[:.]/g, '-')}.dump`;
    const filePath = path.join(backupsDir, fileName);

    // 3. Generar backup de la base de datos
    const DATABASE_URL = process.env.PG_DUMP_URL || process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL no está configurada');
    }

    console.log('📦 Creando backup de la base de datos...');
    execSync(`pg_dump "${DATABASE_URL}" -Fc -f "${filePath}"`, { stdio: 'inherit' });
    console.log('✅ Backup creado:', filePath);

    // 4. Subir a Google Drive
    console.log('☁️ Subiendo a Google Drive...');
    await uploadToDrive(filePath, fileName);
    console.log('✅ Backup subido exitosamente a Google Drive');

    // 5. Eliminar archivo local
    fs.unlinkSync(filePath);
    console.log('🗑️ Archivo local eliminado');

    console.log('🎉 Backup automático completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en backup automático:', error.message);
    // Aquí podrías agregar notificación por email o Slack si falla
  }
}

// Programar backup diario a las 3:00 AM
cron.schedule('0 3 * * *', performDailyBackup, {
  scheduled: true,
  timezone: "America/Mexico_City" // Ajusta según tu zona horaria
});

console.log('⏰ Sistema de backups automáticos iniciado. Se ejecutará diariamente a las 3:00 AM');

// Ejecutar inmediatamente si se llama directamente
if (require.main === module) {
  performDailyBackup();
}

module.exports = { performDailyBackup };
