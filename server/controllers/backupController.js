const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
require("dotenv").config();

/* =========================
   🔍 UTILIDAD
========================= */

const findExecutable = (exeName) => {
    try {
        const cmd = process.platform === 'win32' ? 'where' : 'which';
        const result = require('child_process').execSync(`${cmd} ${exeName}`, { encoding: 'utf8' });
        return result.split('\n')[0].trim();
    } catch {
        return exeName;
    }
};

const withPgBinaryHint = (error, binaryName) => {
    if (error && error.code === "ENOENT") {
        throw new Error(
            `No se encontró '${binaryName}' en el servidor. ` +
            `En Railway instala postgresql-client (Nixpacks aptPkgs) y redeploy.`
        );
    }
    throw error;
};

/* =========================
   📦 BACKUP (pg_dump plain SQL)
========================= */

const generateBackupFile = (databaseUrl, filePath) => {
    const pgDump = findExecutable('pg_dump');

    console.log("📦 Generando backup en SQL (plain)...");

    const outputDir = path.dirname(filePath);
    if (outputDir && outputDir !== "." && !fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        execFileSync(pgDump, [
            '--dbname', databaseUrl,
            '--format=plain',
            '--no-owner',
            '--no-privileges',
            '--file', filePath
        ], {
            stdio: 'inherit'
        });
    } catch (error) {
        withPgBinaryHint(error, "pg_dump");
    }

    console.log("✅ Backup generado:", filePath);

    return filePath;
};

/* =========================
   🔄 RESTORE (psql para SQL plain)
========================= */

const restoreBackupFile = async (databaseUrl, filePath, options = {}) => {
    const psql = findExecutable('psql');
    const tempFile = String(filePath);
    const shouldClean = options.cleanBeforeRestore !== false;

    try {
        console.log("🔄 Restauración PRO iniciada...");

        /* =========================
           💣 RESTORE REAL (PRO)
        ========================= */

        if (shouldClean) {
            console.log("🧹 Limpiando esquema public antes de restaurar...");
            try {
                execFileSync(psql, [
                    '--dbname', databaseUrl,
                    '--set', 'ON_ERROR_STOP=on',
                    '--command', 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'
                ], {
                    stdio: 'inherit'
                });
            } catch (error) {
                withPgBinaryHint(error, "psql");
            }
        }

        try {
            execFileSync(psql, [
                '--dbname', databaseUrl,
                '--set', 'ON_ERROR_STOP=on',
                '--file', tempFile
            ], {
                stdio: 'inherit' // 🔥 MUESTRA ERRORES REALES
            });
        } catch (error) {
            withPgBinaryHint(error, "psql");
        }

        console.log("✅ Restauración COMPLETA exitosa");

        return {
            success: true
        };

    } catch (error) {
        console.error("❌ ERROR REAL en restore:", error.message);

        return {
            success: false,
            error: error.message
        };
    }
};

/* =========================
   🌐 EXPRESS HANDLERS
========================= */

const getDatabaseUrl = () => {
    const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL no está configurada en el servidor.");
    }
    return databaseUrl;
};

const toCliDatabaseUrl = (rawUrl) => {
    try {
        const parsed = new URL(rawUrl);
        // `schema` es válido para algunos ORMs (ej. Prisma), pero no para `psql/pg_dump`.
        parsed.searchParams.delete("schema");
        return parsed.toString();
    } catch {
        return rawUrl;
    }
};

const generateBackup = async (req, res) => {
    try {
        const databaseUrl = toCliDatabaseUrl(getDatabaseUrl());

        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const baseName = `backup_${stamp}.sql`;
        const tempDir = fs.existsSync(path.join(process.cwd(), "uploads"))
            ? path.join(process.cwd(), "uploads")
            : os.tmpdir();
        const outPath = path.join(tempDir, baseName);

        const generatedPath = generateBackupFile(databaseUrl, outPath);

        res.setHeader("Content-Disposition", `attachment; filename="${baseName}"`);
        res.setHeader("Content-Type", "application/sql");

        const stream = fs.createReadStream(generatedPath);
        stream.on("close", () => {
            fs.unlink(generatedPath, () => {});
        });
        stream.on("error", (e) => {
            fs.unlink(generatedPath, () => {});
            res.status(500).json({ error: e.message });
        });
        stream.pipe(res);
    } catch (error) {
        console.error("❌ Error generating backup:", error.message);
        res.status(500).json({ error: error.message });
    }
};

const restoreBackup = async (req, res) => {
    try {
        const databaseUrl = toCliDatabaseUrl(getDatabaseUrl());
        const filePath = req.file?.path;
        if (!filePath) {
            return res.status(400).json({ error: "No se recibió archivo (campo: backupFile)." });
        }

        const cleanBeforeRestore = req.body?.cleanBeforeRestore !== "false" && req.body?.cleanBeforeRestore !== false;
        await restoreBackupFile(databaseUrl, filePath, { cleanBeforeRestore });

        // borrar archivo subido por multer
        fs.unlink(filePath, () => {});

        res.json({ success: true });
    } catch (error) {
        console.error("❌ Error restoring backup:", error.message);
        if (req.file?.path) fs.unlink(req.file.path, () => {});
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    // handlers (usados por Express routes)
    generateBackup,
    restoreBackup,

    // helpers (por si se usan en otros módulos)
    generateBackupFile,
    restoreBackupFile,
};
