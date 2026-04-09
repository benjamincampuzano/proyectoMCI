const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
require("dotenv").config();

const DEFAULT_ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'default-backup-key-32chars!!';
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

/* =========================
   🔐 ENCRIPTACIÓN
========================= */

const encryptData = (data, encryptionKey) => {
    const key = encryptionKey || DEFAULT_ENCRYPTION_KEY;
    const iv = crypto.randomBytes(IV_LENGTH);
    const derivedKey = crypto.scryptSync(key, 'salt', 32);

    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decryptData = (encryptedData, encryptionKey) => {
    const key = encryptionKey || DEFAULT_ENCRYPTION_KEY;
    const [ivHex, contentHex] = String(encryptedData).split(':');
    if (!ivHex || !contentHex) {
        throw new Error("Formato de backup encriptado inválido (se esperaba 'iv:contenido').");
    }

    const iv = Buffer.from(ivHex, 'hex');
    const content = Buffer.from(contentHex, 'hex');
    const derivedKey = crypto.scryptSync(key, 'salt', 32);

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    let decrypted = decipher.update(content);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
};

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

/* =========================
   📦 BACKUP (pg_dump plain SQL)
========================= */

const generateBackupFile = (databaseUrl, filePath, options = {}) => {
    const pgDump = findExecutable('pg_dump');

    console.log("📦 Generando backup en SQL (plain)...");

    const outputDir = path.dirname(filePath);
    if (outputDir && outputDir !== "." && !fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    execFileSync(pgDump, [
        '--dbname', databaseUrl,
        '--format=plain',
        '--no-owner',
        '--no-privileges',
        '--file', filePath
    ], {
        stdio: 'inherit'
    });

    console.log("✅ Backup generado:", filePath);

    /* 🔐 Encriptar opcional */
    if (options.encrypt) {
        const encryptionKey = options.encryptionKey || DEFAULT_ENCRYPTION_KEY;
        const raw = fs.readFileSync(filePath);
        const encrypted = encryptData(raw, encryptionKey);

        fs.writeFileSync(filePath + '.enc', encrypted);
        fs.unlinkSync(filePath);

        console.log("🔐 Backup encriptado generado");
        return filePath + '.enc';
    }

    return filePath;
};

/* =========================
   🔄 RESTORE (psql para SQL plain)
========================= */

const restoreBackupFile = async (databaseUrl, filePath, options = {}) => {
    const psql = findExecutable('psql');
    let tempFile = String(filePath);

    try {
        console.log("🔄 Restauración PRO iniciada...");

        /* =========================
           🔓 DESENCRIPTAR SI ES NECESARIO
        ========================= */
        if (tempFile.endsWith('.enc')) {
            console.log("🔐 Desencriptando backup...");

            const encrypted = fs.readFileSync(tempFile, 'utf8');
            const decryptionKey = options.decryptionKey || options.encryptionKey || DEFAULT_ENCRYPTION_KEY;
            const decryptedBuffer = decryptData(encrypted, decryptionKey);

            tempFile = path.join(__dirname, `temp_restore_${Date.now()}.sql`);
            fs.writeFileSync(tempFile, decryptedBuffer);

            console.log("✅ Desencriptado OK");
        }

        /* =========================
           💣 RESTORE REAL (PRO)
        ========================= */

        execFileSync(psql, [
            '--dbname', databaseUrl,
            '--set', 'ON_ERROR_STOP=on',
            '--file', tempFile
        ], {
            stdio: 'inherit' // 🔥 MUESTRA ERRORES REALES
        });

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

    } finally {
        if (tempFile !== String(filePath) && fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
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

const generateBackup = async (req, res) => {
    try {
        const databaseUrl = getDatabaseUrl();
        const encrypt = Boolean(req.body?.encrypt);
        const encryptionKey = req.body?.encryptionKey;

        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const baseName = `backup_${stamp}.sql`;
        const tempDir = fs.existsSync(path.join(process.cwd(), "uploads"))
            ? path.join(process.cwd(), "uploads")
            : os.tmpdir();
        const outPath = path.join(tempDir, baseName);

        const generatedPath = generateBackupFile(databaseUrl, outPath, { encrypt, encryptionKey });
        const downloadName = encrypt ? `${baseName}.enc` : baseName;

        res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
        res.setHeader("Content-Type", encrypt ? "application/octet-stream" : "application/sql");

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
        const databaseUrl = getDatabaseUrl();
        const filePath = req.file?.path;
        if (!filePath) {
            return res.status(400).json({ error: "No se recibió archivo (campo: backupFile)." });
        }

        const decryptionKey = req.body?.decryptionKey || req.body?.encryptionKey;
        await restoreBackupFile(databaseUrl, filePath, { decryptionKey });

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
