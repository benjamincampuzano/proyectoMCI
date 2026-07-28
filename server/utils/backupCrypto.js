/**
 * Backup Encryption/Decryption Utility
 *
 * Uses AES-256-GCM with PBKDF2 key derivation for encrypting database backups.
 * The encrypted file format is self-describing:
 *
 *   [MAGIC (6 bytes)] [VERSION (1 byte)] [SALT (32 bytes)] [IV (16 bytes)] [AUTH_TAG (16 bytes)] [CIPHERTEXT (...)]
 *
 * - MAGIC:    "MCIENC" — identifies the file as an MCI encrypted backup
 * - VERSION:  0x01     — format version for future-proofing
 * - SALT:     32-byte random salt used for PBKDF2 key derivation
 * - IV:       16-byte random initialisation vector for AES-256-GCM
 * - AUTH_TAG: 16-byte GCM authentication tag (integrity + authenticity)
 * - CIPHERTEXT: the AES-256-GCM encrypted SQL dump
 *
 * The encryption key is derived from the BACKUP_ENCRYPTION_KEY env variable via
 * PBKDF2 (SHA-512, 210 000 iterations). This means even a relatively short
 * passphrase produces a strong 256-bit key, and the random salt prevents
 * rainbow-table attacks.
 */

const crypto = require('crypto');
const fs = require('fs');

/* ──────────────────────────────────
   Constants
   ────────────────────────────────── */

const MAGIC = Buffer.from('MCIENC', 'ascii'); // 6 bytes
const FORMAT_VERSION = 0x01;                   // 1 byte
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;                         // 256 bits
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_DIGEST = 'sha512';

const HEADER_LENGTH = MAGIC.length + 1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH; // 71 bytes

/* ──────────────────────────────────
   Key Derivation
   ────────────────────────────────── */

/**
 * Derive a 256-bit encryption key from the passphrase and a random salt.
 * @param {string} passphrase
 * @param {Buffer} salt
 * @returns {Buffer} 32-byte key
 */
const deriveKey = (passphrase, salt) => {
    return crypto.pbkdf2Sync(
        passphrase,
        salt,
        PBKDF2_ITERATIONS,
        KEY_LENGTH,
        PBKDF2_DIGEST
    );
};

/**
 * Read and validate the BACKUP_ENCRYPTION_KEY environment variable.
 * @returns {string}
 * @throws {Error} if the variable is missing or too short
 */
const getEncryptionKey = () => {
    const key = process.env.BACKUP_ENCRYPTION_KEY;
    if (!key || key.trim().length < 16) {
        throw new Error(
            'BACKUP_ENCRYPTION_KEY no está configurada o es demasiado corta (mínimo 16 caracteres). ' +
            'Configúrala en el archivo .env del servidor.'
        );
    }
    return key.trim();
};

/* ──────────────────────────────────
   Encrypt
   ────────────────────────────────── */

/**
 * Encrypt a plaintext SQL backup file in-place, replacing it with the
 * encrypted version. The original file is overwritten.
 *
 * @param {string} plainFilePath  – path to the plain .sql file
 * @param {string} encFilePath    – path to write the encrypted output
 * @returns {string} encFilePath
 */
const encryptBackupFile = (plainFilePath, encFilePath, userPassphrase) => {
    const passphrase = userPassphrase || getEncryptionKey();

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key
    const key = deriveKey(passphrase, salt);

    // Read plaintext
    const plaintext = fs.readFileSync(plainFilePath);

    // Encrypt
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Build header
    const header = Buffer.alloc(HEADER_LENGTH);
    let offset = 0;
    MAGIC.copy(header, offset); offset += MAGIC.length;
    header.writeUInt8(FORMAT_VERSION, offset); offset += 1;
    salt.copy(header, offset); offset += SALT_LENGTH;
    iv.copy(header, offset); offset += IV_LENGTH;
    authTag.copy(header, offset);

    // Write encrypted file
    fs.writeFileSync(encFilePath, Buffer.concat([header, encrypted]));

    console.log(`🔐 Backup cifrado: ${encFilePath} (${(header.length + encrypted.length)} bytes)`);

    return encFilePath;
};

/* ──────────────────────────────────
   Decrypt
   ────────────────────────────────── */

/**
 * Decrypt an encrypted backup file and write the plaintext SQL to disk.
 *
 * @param {string} encFilePath    – path to the encrypted .sql.enc file
 * @param {string} plainFilePath  – path to write the decrypted SQL
 * @returns {string} plainFilePath
 * @throws {Error} if the file is not a valid MCI encrypted backup or the key is wrong
 */
const decryptBackupFile = (encFilePath, plainFilePath, userPassphrase) => {
    const passphrase = userPassphrase || getEncryptionKey();

    const fileData = fs.readFileSync(encFilePath);

    // Validate minimum size
    if (fileData.length < HEADER_LENGTH) {
        throw new Error('El archivo no es un backup cifrado válido (muy pequeño).');
    }

    // Parse header
    let offset = 0;

    const magic = fileData.subarray(offset, offset + MAGIC.length);
    offset += MAGIC.length;
    if (!magic.equals(MAGIC)) {
        throw new Error(
            'El archivo no es un backup cifrado válido (cabecera incorrecta). ' +
            'Si estás restaurando un backup antiguo sin cifrar (.sql), usa el formato original.'
        );
    }

    const version = fileData.readUInt8(offset);
    offset += 1;
    if (version !== FORMAT_VERSION) {
        throw new Error(
            `Versión de formato no soportada: v${version}. ` +
            `Este servidor soporta v${FORMAT_VERSION}.`
        );
    }

    const salt = fileData.subarray(offset, offset + SALT_LENGTH);
    offset += SALT_LENGTH;

    const iv = fileData.subarray(offset, offset + IV_LENGTH);
    offset += IV_LENGTH;

    const authTag = fileData.subarray(offset, offset + AUTH_TAG_LENGTH);
    offset += AUTH_TAG_LENGTH;

    const ciphertext = fileData.subarray(offset);

    // Derive key
    const key = deriveKey(passphrase, salt);

    // Decrypt
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted;
    try {
        decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch {
        throw new Error(
            'No se pudo descifrar el backup. La clave de cifrado es incorrecta o el archivo está corrupto.'
        );
    }

    fs.writeFileSync(plainFilePath, decrypted);

    console.log(`🔓 Backup descifrado: ${plainFilePath}`);

    return plainFilePath;
};

/* ──────────────────────────────────
   Helpers
   ────────────────────────────────── */

/**
 * Check whether a file appears to be an MCI encrypted backup by reading
 * the first 7 bytes (magic + version).
 *
 * @param {string} filePath
 * @returns {boolean}
 */
const isEncryptedBackup = (filePath) => {
    try {
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(MAGIC.length + 1);
        fs.readSync(fd, buf, 0, buf.length, 0);
        fs.closeSync(fd);
        return buf.subarray(0, MAGIC.length).equals(MAGIC) && buf.readUInt8(MAGIC.length) === FORMAT_VERSION;
    } catch {
        return false;
    }
};

module.exports = {
    encryptBackupFile,
    decryptBackupFile,
    isEncryptedBackup,
    getEncryptionKey,
    HEADER_LENGTH,
};
