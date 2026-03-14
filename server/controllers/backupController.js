const { execSync, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Helper para encontrar ejecutables de PostgreSQL en Windows
const findPgExecutable = (exeName) => {
    // 1. Priorizar variable de entorno específica si existe
    const envVar = exeName === 'pg_dump' ? process.env.PG_DUMP_PATH : process.env.PG_RESTORE_PATH;
    if (envVar && fs.existsSync(envVar)) return envVar;

    // 2. Intentar encontrarlo en el PATH
    try {
        const whereCmd = process.platform === 'win32' ? `where ${exeName}` : `which ${exeName}`;
        const output = execSync(whereCmd, { encoding: 'utf8' }).split('\n')[0].trim();
        if (output && fs.existsSync(output)) return output;
    } catch (e) {
        // Ignorar error si no está en el PATH
    }

    // 3. Rutas comunes en Windows
    if (process.platform === 'win32') {
        const versions = ['18', '17', '16', '15', '14', '13'];
        for (const v of versions) {
            const fullPath = `C:\\Program Files\\PostgreSQL\\${v}\\bin\\${exeName}.exe`;
            if (fs.existsSync(fullPath)) return fullPath;
        }
    }

    return exeName; // Retornar solo el nombre si no se encontró ruta completa
};

const downloadBackup = async (req, res) => {
    try {
        const DATABASE_URL = process.env.PG_DUMP_URL || process.env.DATABASE_URL;

        if (!DATABASE_URL) {
            return res.status(500).json({ error: "DATABASE_URL no está definida" });
        }

        const backupsDir = path.join(__dirname, "../backups");

        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }

        const fileName = `backup_${new Date()
            .toISOString()
            .replace(/[:.]/g, "-")}.dump`;

        const filePath = path.join(backupsDir, fileName);

        const pgDumpPath = findPgExecutable('pg_dump');

        try {
            // Usamos execFileSync para evitar problemas con comillas y espacios en Windows/Linux
            execFileSync(pgDumpPath, [DATABASE_URL, "-Fc", "-f", filePath]);

            // Exponer el header Content-Disposition para que el frontend pueda leer el nombre del archivo
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            
            // Enviar el archivo al cliente
            res.download(filePath, fileName, (err) => {
                if (err) {
                    console.error("Error al enviar el archivo:", err);
                    // No podemos enviar otra respuesta si ya se inició la descarga
                }
                
                // Eliminar el archivo después de enviarlo para ahorrar espacio
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.error("Error al eliminar archivo temporal:", unlinkErr);
                });
            });
        } catch (execError) {
            console.error("Error al ejecutar pg_dump:", execError.message);
            if (execError.stderr) console.error("Detalle stderr:", execError.stderr.toString());
            
            return res.status(500).json({ 
                error: "Error al crear el backup de la base de datos.",
                details: execError.stderr ? execError.stderr.toString() : execError.message
            });
        }
    } catch (error) {
        console.error("Error en downloadBackup:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};

const restoreBackup = async (req, res) => {
    try {
        const DATABASE_URL = process.env.PG_DUMP_URL || process.env.DATABASE_URL;

        if (!DATABASE_URL) {
            return res.status(500).json({ error: "DATABASE_URL no está definida" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "Debes proporcionar un archivo de backup" });
        }

        const filePath = req.file.path;
        const pgRestorePath = findPgExecutable('pg_restore');

        try {
            // execFileSync evita problemas de la shell con símbolos y espacios
            execFileSync(pgRestorePath, [
                "--clean",
                "--if-exists",
                "--no-owner",
                "--dbname=" + DATABASE_URL,
                filePath
            ]);

            // Eliminar el archivo temporal
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error("Error al eliminar archivo temporal:", unlinkErr);
            });

            return res.status(200).json({ message: "Base de datos restaurada exitosamente" });
        } catch (execError) {
            console.error("❌ Error al ejecutar pg_restore:");
            console.error("Mensaje de error:", execError.message);

            if (execError.stderr) {
                console.error("Stderr detallado:", execError.stderr.toString());
            }

            if (execError.stdout) {
                console.error("Stdout:", execError.stdout.toString());
            }

            // Verificar si el ejecutable existe
            console.error("Ruta de pg_restore utilizada:", pgRestorePath);
            console.error("¿pg_restore existe?", fs.existsSync(pgRestorePath));

            return res.status(500).json({
                error: "Error al restaurar la base de datos.",
                details: execError.stderr ? execError.stderr.toString() : execError.message,
                pgRestorePath: pgRestorePath,
                fileExists: fs.existsSync(filePath)
            });
        }
    } catch (error) {
        console.error("Error en restoreBackup:", error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};


module.exports = {
    downloadBackup,
    restoreBackup
};
