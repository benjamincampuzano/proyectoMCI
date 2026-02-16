const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Rutas completas para PostgreSQL en Windows
// const PG_DUMP_PATH = "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe";
// const PG_RESTORE_PATH = "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_restore.exe";

const downloadBackup = async (req, res) => {
    try {
        const DATABASE_URL = process.env.PG_DUMP_URL;

        if (!DATABASE_URL) {
            return res.status(500).json({ error: "DATABASE_URL no está definida" });
        }

        const backupsDir = path.join(__dirname, "../backups");

        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir);
        }

        const fileName = `backup_${new Date()
            .toISOString()
            .replace(/[:.]/g, "-")}.dump`;

        const filePath = path.join(backupsDir, fileName);

        console.log("📦 Iniciando backup PostgreSQL...");

        const cmd = `"${PG_DUMP_PATH}" "${DATABASE_URL}" -Fc -f "${filePath}"`;

        try {
            execSync(cmd, { stdio: "inherit" });
            console.log("✅ Backup completado:", filePath);

            // Enviar el archivo al cliente
            res.download(filePath, fileName, (err) => {
                if (err) {
                    console.error("Error al enviar el archivo:", err);
                    return res.status(500).json({ error: "Error al descargar el backup" });
                }
                
                // Opcional: eliminar el archivo después de enviarlo
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.error("Error al eliminar archivo temporal:", unlinkErr);
                });
            });
        } catch (execError) {
            console.error("Error al ejecutar pg_dump:", execError);
            return res.status(500).json({ error: "Error al crear el backup de la base de datos" });
        }
    } catch (error) {
        console.error("Error en downloadBackup:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};

const restoreBackup = async (req, res) => {
    try {
        const DATABASE_URL = process.env.PG_DUMP_URL;

        if (!DATABASE_URL) {
            return res.status(500).json({ error: "DATABASE_URL no está definida" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "Debes proporcionar un archivo de backup" });
        }

        const filePath = req.file.path;

        console.log("♻️ Restaurando backup...");
        console.log("📌 Archivo:", filePath);

        // Limpia y restaura completo
        const cmd = `"${PG_RESTORE_PATH}" --clean --if-exists --no-owner --dbname="${DATABASE_URL}" "${filePath}"`;

        try {
            execSync(cmd, { stdio: "inherit" });
            console.log("✅ Restore completado con éxito.");

            // Eliminar el archivo temporal
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error("Error al eliminar archivo temporal:", unlinkErr);
            });

            return res.status(200).json({ message: "Base de datos restaurada exitosamente" });
        } catch (execError) {
            console.error("Error al ejecutar pg_restore:", execError);
            return res.status(500).json({ error: "Error al restaurar la base de datos" });
        }
    } catch (error) {
        console.error("Error en restoreBackup:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};

const uploadToDrive = require("../scripts/driveUpload");

exports.backupToDrive = async (req, res) => {
  try {
    const fileName = `backup_${Date.now()}.dump`;
    const filePath = `backups/${fileName}`;

    // 1. Generar backup
    execSync(`pg_dump "${process.env.PG_DUMP_URL}" -Fc -f "${filePath}"`);

    // 2. Subir a Drive
    await uploadToDrive(filePath, fileName);

    // 3. Borrar archivo local
    fs.unlinkSync(filePath);

    res.json({ success: true, message: "Backup guardado en Google Drive" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
    downloadBackup,
    restoreBackup
};
