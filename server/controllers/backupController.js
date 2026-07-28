const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
require("dotenv").config();
const { encryptBackupFile, decryptBackupFile, isEncryptedBackup } = require("../utils/backupCrypto");

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
    const filesToClean = [];
    try {
        const databaseUrl = toCliDatabaseUrl(getDatabaseUrl());

        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const tempDir = fs.existsSync(path.join(process.cwd(), "uploads"))
            ? path.join(process.cwd(), "uploads")
            : os.tmpdir();

        // 1. Generate plain SQL dump
        const plainPath = path.join(tempDir, `backup_${stamp}.sql`);
        generateBackupFile(databaseUrl, plainPath);
        filesToClean.push(plainPath);

        // 2. Encrypt the dump
        const encName = `backup_${stamp}.sql.enc`;
        const encPath = path.join(tempDir, encName);
        encryptBackupFile(plainPath, encPath, req.body?.password);
        filesToClean.push(encPath);

        // Remove the plain dump immediately — only the encrypted file is served
        fs.unlinkSync(plainPath);
        filesToClean.splice(filesToClean.indexOf(plainPath), 1);

        // 3. Stream the encrypted file to the client
        res.setHeader("Content-Disposition", `attachment; filename="${encName}"`);
        res.setHeader("Content-Type", "application/octet-stream");

        const stream = fs.createReadStream(encPath);
        const cleanup = () => {
            for (const f of filesToClean) {
                fs.unlink(f, (err) => {
                    if (err && process.env.NODE_ENV !== 'production') {
                        console.warn('⚠️ No se pudo eliminar temporal:', f, err.message);
                    }
                });
            }
        };
        stream.on("close", cleanup);
        stream.on("error", (e) => {
            cleanup();
            res.status(500).json({ error: e.message });
        });
        stream.pipe(res);
    } catch (error) {
        // Clean up any temp files on failure
        for (const f of filesToClean) {
            fs.unlink(f, () => {});
        }
        console.error("❌ Error generating backup:", error.message);
        res.status(500).json({ error: error.message });
    }
};

const restoreBackup = async (req, res) => {
    const filesToClean = [];
    try {
        const databaseUrl = toCliDatabaseUrl(getDatabaseUrl());
        const filePath = req.file?.path;
        if (!filePath) {
            return res.status(400).json({ error: "No se recibió archivo (campo: backupFile)." });
        }
        filesToClean.push(filePath);

        // Determine if the uploaded file is encrypted and decrypt if needed
        let sqlFilePath = filePath;
        if (isEncryptedBackup(filePath)) {
            console.log("🔐 Backup cifrado detectado, descifrando...");
            const decryptedPath = filePath + '.decrypted.sql';
            decryptBackupFile(filePath, decryptedPath, req.body?.password);
            filesToClean.push(decryptedPath);
            sqlFilePath = decryptedPath;
        } else {
            console.log("📄 Backup sin cifrar detectado (formato legacy), restaurando directamente...");
        }

        const cleanBeforeRestore = req.body?.cleanBeforeRestore !== "false" && req.body?.cleanBeforeRestore !== false;
        await restoreBackupFile(databaseUrl, sqlFilePath, { cleanBeforeRestore });

        // Clean up all temp files
        for (const f of filesToClean) {
            fs.unlink(f, (err) => {
                if (err && process.env.NODE_ENV !== 'production') {
                    console.warn('⚠️ No se pudo eliminar temporal:', f, err.message);
                }
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("❌ Error restoring backup:", error.message);
        for (const f of filesToClean) {
            fs.unlink(f, (err) => {
                if (err && process.env.NODE_ENV !== 'production') {
                    console.warn('⚠️ No se pudo eliminar temporal:', f, err.message);
                }
            });
        }
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
