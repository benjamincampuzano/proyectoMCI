const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
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
   📦 BACKUP (pg_dump -Fc)
========================= */

const generateBackup = (databaseUrl, filePath, options = {}) => {
    const pgDump = findExecutable('pg_dump');

    console.log("📦 Generando backup en formato binario (PRO)...");

    const outputDir = path.dirname(filePath);
    if (outputDir && outputDir !== "." && !fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    execFileSync(pgDump, [
        '--dbname', databaseUrl,
        '--format=custom', // 🔥 CLAVE
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
   🔄 RESTORE (pg_restore PRO)
========================= */

const restoreBackup = async (databaseUrl, filePath, options = {}) => {
    const pgRestore = findExecutable('pg_restore');

    let tempFile = filePath;

    try {
        console.log("🔄 Restauración PRO iniciada...");

        /* =========================
           🔓 DESENCRIPTAR SI ES NECESARIO
        ========================= */
        if (filePath.endsWith('.enc')) {
            console.log("🔐 Desencriptando backup...");

            const encrypted = fs.readFileSync(filePath, 'utf8');
            const decryptionKey = options.decryptionKey || options.encryptionKey || DEFAULT_ENCRYPTION_KEY;
            const decryptedBuffer = decryptData(encrypted, decryptionKey);

            tempFile = path.join(__dirname, `temp_restore_${Date.now()}.dump`);
            fs.writeFileSync(tempFile, decryptedBuffer);

            console.log("✅ Desencriptado OK");
        }

        /* =========================
           💣 RESTORE REAL (PRO)
        ========================= */

        const restoreArgs = [
            '--dbname', databaseUrl,

            '--clean',            // 🔥 DROP antes de crear
            '--if-exists',        // evita errores si no existe
            '--no-owner',
            '--no-privileges',
        ];

        // Nota: `pg_restore --jobs` solo funciona con formato "directory".
        // Si el backup es un archivo (custom), omite jobs para evitar fallos.
        if (Number.isInteger(options.jobs) && options.jobs > 1) {
            try {
                if (fs.statSync(tempFile).isDirectory()) {
                    restoreArgs.push(`--jobs=${options.jobs}`);
                } else {
                    console.warn("⚠️ Se ignoró options.jobs: el backup no es formato directory.");
                }
            } catch {
                // si no se puede stat, no arriesgarse a romper el restore
            }
        }

        restoreArgs.push(tempFile);

        execFileSync(pgRestore, restoreArgs, {
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
        if (tempFile !== filePath && fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    }
};

module.exports = {
    generateBackup,
    restoreBackup
};
